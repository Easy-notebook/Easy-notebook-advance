// src/App.jsx
import NotebookApp from './components/Notebook/NotebookApp'

function App() {
  return (
    <div className="min-h-screen bg-gray-50" style={
      {
        position:'absolute',
        top:0,
        left:0,
        right:0,
        bottom:0
      }
    }>
      <NotebookApp />
    </div>
  )
}

export default App