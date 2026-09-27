import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

function SkillGapChart() {
  const data = [
    { skill: 'HTML', current: 90, required: 90 },
    { skill: 'CSS', current: 85, required: 90 },
    { skill: 'JavaScript', current: 60, required: 85 },
    { skill: 'React', current: 40, required: 80 },
  ]

  return (
    <div className="bg-slate-indigo rounded-2xl p-6 w-full max-w-md">
      <h3 className="text-xl font-semibold text-voice-teal mb-4">Skill Gap Analysis</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="skill" stroke="#F4F3FF" />
          <YAxis stroke="#F4F3FF" />
          <Tooltip contentStyle={{ backgroundColor: '#1A1A2E', border: 'none' }} />
          <Bar dataKey="current" fill="#A29BFE" name="Current Level" radius={[6, 6, 0, 0]} />
          <Bar dataKey="required" fill="#00CEC9" name="Required Level" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default SkillGapChart