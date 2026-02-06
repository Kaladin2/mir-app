import { useState } from 'react';
import './App.css'; // Importamos los estilos

function App() {
  // Estado para los contadores
  const [correctas, setCorrectas] = useState(0);
  const [incorrectas, setIncorrectas] = useState(0);
  const [enBlanco, setEnBlanco] = useState(0);

  // Lista de temas actualizada
  const listaTemas = [
    "Cardiologia", "Traumatologia", "Nefrologia/Urologia", "Pediatria", 
    "Farmacologia", "Ginecologia", "Digestivo", "Respiratorio", 
    "Oncologia", "Geriatria", "Urgencias y Emergencias", "Psiquiatria", 
    "Investigacion", "UCI", "Endocrinologia"
  ];

  // Función para manejar la respuesta y actualizar contadores
  const manejarRespuesta = (tipo) => {
    if (tipo === 'correcta') setCorrectas(correctas + 1);
    else if (tipo === 'incorrecta') setIncorrectas(incorrectas + 1);
    else if (tipo === 'blanco') setEnBlanco(enBlanco + 1);
    
    // Aquí iría la lógica para cargar la siguiente pregunta de Supabase
    console.log(`Respuesta registrada: ${tipo}`);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Centro de Entrenamiento MIR</h1>
      </header>

      <main className="main-content">
        {/* Sección de Temas */}
        <section className="temas-section">
          <h2>Temas de Estudio</h2>
          <div className="temas-grid">
            {listaTemas.map(tema => (
              <button key={tema} className="tema-button">
                {tema}
              </button>
            ))}
          </div>
        </section>

        {/* Sección de Contadores Estética */}
        <section className="contadores-section">
          <h2>Estadísticas de la Sesión</h2>
          <div className="contadores-grid">
            <div className="contador-card correcta">
              <span className="icon">✅</span>
              <h3>Correctas</h3>
              <p className="numero">{correctas}</p>
            </div>
            <div className="contador-card incorrecta">
              <span className="icon">❌</span>
              <h3>Incorrectas</h3>
              <p className="numero">{incorrectas}</p>
            </div>
            <div className="contador-card blanco">
              <span className="icon">⚪</span>
              <h3>En Blanco</h3>
              <p className="numero">{enBlanco}</p>
            </div>
          </div>
        </section>

        {/* Botones de acción para probar */}
        <section className="acciones-section">
          <button onClick={() => manejarRespuesta('correcta')} className="accion-button correcta-btn">Marcar Correcta</button>
          <button onClick={() => manejarRespuesta('incorrecta')} className="accion-button incorrecta-btn">Marcar Incorrecta</button>
          <button onClick={() => manejarRespuesta('blanco')} className="accion-button blanco-btn">Marcar en Blanco</button>
        </section>
      </main>
    </div>
  );
}

export default App;