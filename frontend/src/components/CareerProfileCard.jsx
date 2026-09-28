/**
 * The candidate's career profile for the role they are targeting.
 * Everything here is returned by the backend; there is no default profile.
 */
function CareerProfileCard({ roleTitle, targetRole, skillGaps, roadmap, mode }) {
  const skills = skillGaps?.currentSkills || []
  const matched = skillGaps?.matchedSkills || []
  const interests = roadmap?.interviewThemes || []
  const experience = skillGaps?.experienceLevel?.label

  if (!roleTitle && !skillGaps) {
    return (
      <div className="bg-slate-indigo rounded-2xl p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold text-voice-teal mb-4">Career Profile</h3>
        <p className="text-slate-300 text-sm">Choose a target job to build your profile.</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-indigo rounded-2xl p-6 w-full max-w-md">
      <h3 className="text-xl font-semibold text-voice-teal mb-4">Career Profile</h3>

      <p className="text-cloud-white mb-2">
        <span className="text-soft-lavender">Goal:</span> {roleTitle || targetRole}
      </p>

      <p className="text-cloud-white mb-2">
        <span className="text-soft-lavender">Experience:</span> {experience || 'not recorded'}
        {mode ? <span className="text-slate-400"> · {mode} interview</span> : null}
      </p>

      {skillGaps ? (
        <p className="text-cloud-white mb-2">
          <span className="text-soft-lavender">Readiness:</span> {skillGaps.readiness}% ·{' '}
          {matched.length}/{skillGaps.totalRequired} requirements covered
        </p>
      ) : null}

      <p className="text-soft-lavender mb-1 mt-3">Skills:</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {skills.length ? (
          skills.map((skill, i) => (
            <span key={`${skill}-${i}`} className="bg-electric-violet/30 text-cloud-white px-3 py-1 rounded-full text-sm">
              {skill}
            </span>
          ))
        ) : (
          <span className="text-slate-400 text-sm">None recorded yet.</span>
        )}
      </div>

      {matched.length ? (
        <>
          <p className="text-soft-lavender mb-1">Already covered for this role:</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {matched.map((skill) => (
              <span key={skill} className="bg-voice-teal/20 text-cloud-white px-3 py-1 rounded-full text-sm">
                {skill}
              </span>
            ))}
          </div>
        </>
      ) : null}

      {interests.length ? (
        <>
          <p className="text-soft-lavender mb-1">What this role is assessed on:</p>
          <div className="flex flex-wrap gap-2">
            {interests.map((item) => (
              <span key={item} className="bg-voice-teal/20 text-cloud-white px-3 py-1 rounded-full text-sm">
                {item}
              </span>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

export default CareerProfileCard
