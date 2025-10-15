import logo from './logo.svg';
import './App.css';
import PDFUpload from "./components/PDFUpload";
import ChatBot from "./components/ChatBot";

function App() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 32 }}>
      <PDFUpload />
      <ChatBot />
    </div>
  );
}

export default App;
