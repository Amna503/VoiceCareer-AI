import { useCallback, useEffect, useRef, useState } from 'react'
import VoiceAgentClient, { CONNECTION_STATES } from '../lib/voiceAgentClient'

/** Roles the career engine knows about. Fetched from the backend, not hardcoded. */
const INTERVIEW_MODES = [
  { value: 'technical', label: 'Technical' },
  { value: 'hr', label: 'HR / Behavioral' },
]

/**
 * React wrapper around the AssemblyAI Voice Agent client.
 * Owns the live transcript, the connection state and the agent's tool activity.
 */
export default function useVoiceAgent() {
  const [connectionState, setConnectionState] = useState(CONNECTION_STATES.DISCONNECTED)
  const [statusLabel, setStatusLabel] = useState('Not connected')
  const [messages, setMessages] = useState([])
  const [interimUser, setInterimUser] = useState('')
  const [error, setError] = useState(null)
  const [toolActivity, setToolActivity] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [isStarting, setIsStarting] = useState(false)

  const clientRef = useRef(null)
  const messagesRef = useRef([])
  const disconnectRef = useRef(null)

  const disconnect = useCallback(async () => {
    const client = clientRef.current
    if (!client) return
    try {
      await client.stop()
    } catch {
      /* ignore */
    }
    clientRef.current = null
  }, [])

  useEffect(() => {
    disconnectRef.current = disconnect
  }, [disconnect])

  useEffect(() => {
    const handlePageHide = () => {
      // Synchronous on purpose: anything async will not beat the socket teardown.
      const client = clientRef.current
      if (client && client.ws && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify({ type: 'session.end' }))
        } catch {
          /* ignore */
        }
      }
    }

    window.addEventListener('pagehide', handlePageHide)
    return () => {
      window.removeEventListener('pagehide', handlePageHide)
      disconnectRef.current?.()
    }
  }, [])

  const start = useCallback(
    async (options = {}) => {
      if (clientRef.current) return

      setError(null)
      setMessages([])
      setInterimUser('')
      setToolActivity([])
      messagesRef.current = []
      setIsStarting(true)

      const client = new VoiceAgentClient({
        targetRole: options.targetRole || 'general',
        mode: options.mode || 'technical',
        maxQuestions: options.maxQuestions || 8,
        candidateName: options.candidateName || '',
        candidateProfile: options.candidateProfile || null,
        jobDescription: options.jobDescription || '',

        onStateChange: (next) => {
          setConnectionState(next)
          setStatusLabel(client.statusLabel)
        },
        onMessage: (message) => {
          messagesRef.current = [...messagesRef.current, message]
          setMessages(messagesRef.current)
        },
        onInterimUser: (text) => setInterimUser(text),
        onToolActivity: ({ name, status }) => {
          setToolActivity((prev) => {
            const existing = prev.findIndex((item) => item.name === name)
            if (existing === -1) return [...prev, { name, status }]
            const next = [...prev]
            next[existing] = { name, status }
            return next
          })
        },
        onError: (err) => setError(err.message || 'Voice agent error'),
        onAgentAudioEnd: () => {
          setConnectionState((current) =>
            current === CONNECTION_STATES.SPEAKING ? CONNECTION_STATES.CONNECTED : current
          )
        },
      })

      clientRef.current = client

      try {
        await client.start()
        setSessionId(client.sessionId)
      } catch (err) {
        clientRef.current = null
        setError(err.message || 'Could not start the voice interview')
        setConnectionState(CONNECTION_STATES.ERROR)
      } finally {
        setIsStarting(false)
      }
    },
    []
  )

  /** Conversation history in the shape the ai/ evaluation module expects. */
  const getInterviewHistory = useCallback(() => {
    return messagesRef.current
      .filter((message) => message.text && message.text.trim())
      .map((message) => ({
        role: message.speaker === 'agent' ? 'assistant' : 'user',
        content: message.text,
      }))
  }, [])

  const isConnected = connectionState !== CONNECTION_STATES.DISCONNECTED

  return {
    connectionState,
    statusLabel,
    messages,
    interimUser,
    error,
    toolActivity,
    sessionId,
    isStarting,
    isConnected,
    start,
    stop: disconnect,
    getInterviewHistory,
    modes: INTERVIEW_MODES,
  }
}
