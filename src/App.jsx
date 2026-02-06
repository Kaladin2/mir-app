import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

function App() {
  const [todasLasPreguntas, setTodasLasPreguntas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paginaActual, setPaginaActual] = useState('menu'); // 'menu', 'juego', 'administrar'

  // --- ESTADO DEL JUEGO ---
  const [preguntasJuego, setPreguntasJuego] = useState([]);
  const [preguntaActualIndex, setPreguntaActualIndex] = useState(0);
  const [respuestaSeleccionada, setRespuestaSeleccionada] = useState(null);
  const [comprobado, setComprobado] = useState(false);
  const [indiceCorrectaMezclada, setIndiceCorrectaMezclada] = useState(null);
  const [opcionesMezcladas, setOpcionesMezcladas] = useState([]);
  const [resultadosMapa, setResultadosMapa] = useState([]); 

  // --- CONTADORES ---
  const [correctas, setCorrectas] = useState(0);
  const [incorrectas, setIncorrectas] = useState(0);
  const [enBlanco, setEnBlanco] = useState(0);

  // --- ESTADOS FORMULARIO ADMINISTRADOR ---
  const [nuevaPregunta, setNuevaPregunta] = useState("");
  const [opcionesForm, setOpcionesForm] = useState(["", "", "", ""]);
  const [respuestaCorrectaInput, setRespuestaCorrectaInput] = useState(1);
  const [temaInput, setTemaInput] = useState("");

  const listaTemas = [
    "Cardiologia", "Traumatologia", "Nefrologia/Urologia", "Pediatria", 
    "Farmacologia", "Ginecologia", "Digestivo", "Respiratorio", 
    "Oncologia", "Geriatria", "Urgencias y Emergencias", "Psiquiatria", 
    "Investigacion", "UCI", "Endocrinologia"
  ];

  // Cargar preguntas desde Supabase al iniciar
  useEffect(() => {
    fetchPreguntas();
    setTemaInput(listaTemas[0]);
  }, []);

  async function fetchPreguntas() {
    setLoading(true);
    const { data, error } = await supabase
      .from('preguntas')
      .select('*');
    
    if (error) console.log('Error cargando:', error);
    else setTodasLasPreguntas(data || []);
    setLoading(false);
  }

  // --- LÓGICA DE JUEGO ---
  const prepararPregunta = (index) => {
    const pregunta = preguntasJuego[index];
    if (!pregunta) return;
    
    const opcionesArray = [pregunta.opcionA, pregunta.opcionB, pregunta.opcionC, pregunta.opcionD];
    
    let opcionesConId = opcionesArray.map((texto, index) => ({
      texto,
      esCorrecta: index === pregunta.correcta - 1
    }));

    // Fisher-Yates shuffle para mezclar opciones
    for (let i = opcionesConId.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opcionesConId[i], opcionesConId[j]] = [opcionesConId[j], opcionesConId[i]];
    }

    setOpcionesMezcladas(opcionesConId.map(o => o.texto));
    setIndiceCorrectaMezclada(opcionesConId.findIndex(o => o.esCorrecta) + 1);
    setRespuestaSeleccionada(null);
    setComprobado(false);
    setPreguntaActualIndex(index);
  };

  const iniciarJuego = (preguntasSeleccionadas) => {
    if (preguntasSeleccionadas.length === 0) {
      alert("No hay preguntas disponibles");
      return;
    }
    const mezcladas = [...preguntasSeleccionadas].sort(() => 0.5 - Math.random());
    const seleccionadas = mezcladas.slice(0, 50);
    setPreguntasJuego(seleccionadas);
    
    // Inicializar mapa de resultados
    setResultadosMapa(seleccionadas.map((_, i) => ({ index: i, resultado: null })));
    
    // Resetear contadores
    setCorrectas(0);
    setIncorrectas(0);
    setEnBlanco(0);
    
    setPaginaActual('juego');
    prepararPregunta(0);
  };

  const comprobarRespuesta = (esEnBlanco = false) => {
    setComprobado(true);
    let resultado = 'incorrecto';
    
    if (esEnBlanco) {
      resultado = 'blanco';
      setEnBlanco(prev => prev + 1);
    } else {
      const esCorrecta = respuestaSeleccionada === indiceCorrectaMezclada;
      if (esCorrecta) {
        resultado = 'correcto';
        setCorrectas(prev => prev + 1);
      } else {
        resultado = 'incorrecto';
        setIncorrectas(prev => prev + 1);
      }
    }

    // Actualizar el mapa
    setResultadosMapa(prev => prev.map(item => 
      item.index === preguntaActualIndex 
        ? { ...item, resultado: resultado } 
        : item
    ));
  };

  const agregarPregunta = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from('preguntas')
      .insert([
        { 
          pregunta: nuevaPregunta,
          opcionA: opcionesForm[0],
          opcionB: opcionesForm[1],
          opcionC: opcionesForm[2],
          opcionD: opcionesForm[3],
          correcta: parseInt(respuestaCorrectaInput),
          tema: temaInput
        },
      ]);

    if (error) {
      alert("Error al guardar: " + error.message);
    } else {
      alert("Pregunta añadida");
      setNuevaPregunta("");
      setOpcionesForm(["", "", "", ""]);
      setRespuestaCorrectaInput(1);
      fetchPreguntas();
    }
  };

  if (loading) return <div className="app-container">Cargando...</div>;

  // --- RENDERIZADO DE VISTAS ---

  // 1. MENÚ PRINCIPAL
  if (paginaActual === 'menu') {
    return (
      <div className="app-container">
        <div className="menu-box">
          <header className="app-header">
            <h1>Centro de Entrenamiento MIR</h1>
          </header>
          <div className="menu-botones">
            <button onClick={() => iniciarJuego(todasLasPreguntas)} className="menu-btn primary">Preguntas Aleatorias (50)</button>
            <button onClick={() => setPaginaActual('temas')} className="menu-btn secondary">Elegir Tema</button>
            <button onClick={() => setPaginaActual('administrar')} className="menu-btn tertiary">Administrador</button>
          </div>
        </div>
      </div>
    );
  }

  // 2. SELECCIÓN DE TEMAS
  if (paginaActual === 'temas') {
    return (
      <div className="app-container">
        <button onClick={() => setPaginaActual('menu')} className="boton-volver">⬅ Volver</button>
        <h2>Selecciona un Tema</h2>
        <div className="temas-grid">
          {listaTemas.map(tema => (
            <button key={tema} className="tema-button" onClick={() => {
              const preguntasTema = todasLasPreguntas.filter(p => p.tema === tema);
              iniciarJuego(preguntasTema);
            }}>{tema}</button>
          ))}
        </div>
      </div>
    );
  }

  // 3. VISTA DE JUEGO
  if (paginaActual === 'juego') {
    const preguntaActual = preguntasJuego[preguntaActualIndex];
    if (!preguntaActual) return <div className="app-container">No hay preguntas en este tema.</div>;

    return (
      <div className="app-container" style={{flexDirection: 'row', alignItems: 'flex-start'}}>
        {/* Panel Lateral */}
        <div className="panel-lateral">
          <button onClick={() => setPaginaActual('menu')} className="boton-volver">Salir</button>
          <h3>Mapa</h3>
          <div className="mapa-preguntas">
            {resultadosMapa.map((item, index) => {
              let claseMapa = "boton-mapa";
              if (item.resultado === 'correcto') claseMapa += " correcto";
              else if (item.resultado === 'incorrecto') claseMapa += " incorrecto";
              else if (item.resultado === 'blanco') claseMapa += " blanco";
              if (preguntaActualIndex === index) claseMapa += " activo";
              return (
                <button key={index} className={claseMapa} onClick={() => prepararPregunta(index)}>
                  {index + 1}
                </button>
              );
            })}
          </div>
          
          <div className="estadisticas-mini">
            <div className="stat correcta">✅ {correctas}</div>
            <div className="stat incorrecta">❌ {incorrectas}</div>
            <div className="stat blanco">⚪ {enBlanco}</div>
          </div>
        </div>

        {/* Área de Pregunta */}
        <div className="examen-container">
          <div className="area-pregunta">
            <div className="progreso">
              <span>Pregunta {preguntaActualIndex + 1} / {preguntasJuego.length}</span>
              <span className="tema-badge">{preguntaActual.tema}</span>
            </div>
            <h2>{preguntaActual.pregunta}</h2>
            <div className="opciones-container">
              {opcionesMezcladas.map((opcion, index) => {
                let claseBoton = "boton-opcion";
                if (comprobado) {
                  if (index + 1 === indiceCorrectaMezclada) claseBoton += " correcto";
                  else if (index + 1 === respuestaSeleccionada) claseBoton += " incorrecto";
                } else if (respuestaSeleccionada === index + 1) {
                  claseBoton += " seleccionado";
                }
                return (
                  <button key={index} className={claseBoton} onClick={() => {
                    if(!comprobado) setRespuestaSeleccionada(index + 1);
                  }}>
                    <span className="letra-opcion">{String.fromCharCode(65 + index)}</span>
                    {opcion}
                  </button>
                );
              })}
            </div>
            <div className="footer-pregunta">
              <button className="btn-secondary" onClick={() => comprobarRespuesta(true)} disabled={comprobado}>
                Dejar en Blanco
              </button>
              <button className="btn-primary" onClick={() => comprobarRespuesta(false)} disabled={!respuestaSeleccionada || comprobado}>
                Comprobar
              </button>
              <button className="btn-next" onClick={() => {
                if (preguntaActualIndex < preguntasJuego.length - 1) {
                  prepararPregunta(preguntaActualIndex + 1);
                }
              }} disabled={!comprobado}>
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. ADMINISTRADOR
  if (paginaActual === 'administrar') {
    return (
      <div className="app-container">
        <button onClick={() => setPaginaActual('menu')} className="boton-volver">⬅ Volver</button>
        <h2>Administrar Preguntas</h2>
        <form onSubmit={agregarPregunta} className="formulario-pregunta">
          <label>Tema</label>
          <select value={temaInput} onChange={e => setTemaInput(e.target.value)}>
            {listaTemas.map(tema => <option key={tema} value={tema}>{tema}</option>)}
          </select>
          <textarea placeholder="Enunciado de la pregunta..." value={nuevaPregunta} onChange={e => setNuevaPregunta(e.target.value)} required />
          {opcionesForm.map((op, i) => (
            <input key={i} type="text" placeholder={`Opción ${String.fromCharCode(65 + i)}`} value={op} onChange={e => {
              const nuevasOpciones = [...opcionesForm];
              nuevasOpciones[i] = e.target.value;
              setOpcionesForm(nuevasOpciones);
            }} required />
          ))}
          <label>Número Respuesta Correcta (1-4)</label>
          <input type="number" min="1" max="4" value={respuestaCorrectaInput} onChange={e => setRespuestaCorrectaInput(e.target.value)} required />
          <button type="submit" className="btn-primary">Guardar Pregunta</button>
        </form>
      </div>
    );
  }

  return null;
}
export default App;