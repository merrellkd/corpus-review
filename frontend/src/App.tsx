import { ProjectWorkspace } from './components/ProjectWorkspace'

function App() {
  // For demo purposes, using a hardcoded project ID
  // In a real app, this would come from routing or project selection
  const projectId = 'project_550e8400-e29b-41d4-a716-446655440000'

  return (
    <div className="App">
      <ProjectWorkspace projectId={projectId} />
    </div>
  )
}

export default App