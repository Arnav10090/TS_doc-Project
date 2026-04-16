import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import HomePage from './pages/Home'
import EditorPage from './pages/Editor'
import NewProjectModal from './components/modals/NewProjectModal'

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/editor/:projectId" element={<EditorPage />} />
      </Routes>
      <NewProjectModal />
      <Toaster position="top-right" />
    </>
  )
}

export default App
