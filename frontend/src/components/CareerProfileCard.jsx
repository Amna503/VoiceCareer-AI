function CareerProfileCard() {
  const profile = {
    goal: 'Frontend Developer',
    skills: ['HTML', 'CSS', 'JavaScript', 'React'],
    interests: ['Web Development', 'UI Design'],
    experience: 'Beginner / Intermediate',
  }

  return (
    <div className="bg-slate-indigo rounded-2xl p-6 w-full max-w-md">
      <h3 className="text-xl font-semibold text-voice-teal mb-4">Career Profile</h3>
      
      <p className="text-cloud-white mb-2">
        <span className="text-soft-lavender">Goal:</span> {profile.goal}
      </p>
      
      <p className="text-cloud-white mb-2">
        <span className="text-soft-lavender">Experience:</span> {profile.experience}
      </p>

      <p className="text-soft-lavender mb-1 mt-3">Skills:</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {profile.skills.map((skill, i) => (
          <span key={i} className="bg-electric-violet/30 text-cloud-white px-3 py-1 rounded-full text-sm">
            {skill}
          </span>
        ))}
      </div>

      <p className="text-soft-lavender mb-1">Interests:</p>
      <div className="flex flex-wrap gap-2">
        {profile.interests.map((interest, i) => (
          <span key={i} className="bg-voice-teal/20 text-cloud-white px-3 py-1 rounded-full text-sm">
            {interest}
          </span>
        ))}
      </div>
    </div>
  )
}

export default CareerProfileCard