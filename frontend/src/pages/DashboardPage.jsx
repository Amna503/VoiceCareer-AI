import CareerProfileCard from '../components/CareerProfileCard'
import SkillGapChart from '../components/SkillGapChart'
import InterviewResults from '../components/InterviewResults'
import RoadmapCard from '../components/RoadmapCard'

function DashboardPage() {
  return (
    <div className="min-h-screen bg-midnight-navy text-cloud-white px-6 py-10 flex flex-col items-center gap-8">
      <h2 className="text-3xl font-bold text-soft-lavender">Career Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        <CareerProfileCard />
        <SkillGapChart />
        <InterviewResults />
        <RoadmapCard />
      </div>
    </div>
  )
}

export default DashboardPage