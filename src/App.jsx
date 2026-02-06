import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

function App() {
  const [todasLasPreguntas, setTodasLasPreguntas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar preguntas desde Supabase
  useEffect(() => {
    fetchPreguntas();
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

  const listaTemas = [
    "Cardiologia", "Traumatologia", "Nefrologia/Urologia", "Pediatria", 
    "Farmacologia", "Ginecologia", "Digestivo", "Respiratorio", 
    "Oncologia", "Geriatria", "Urgencias y Emergencias", "Psiquiatria", 
    "Investigacion", "UCI"
  ];

  const [paginaActual, setPaginaActual] = useState('menu');
  const [preguntasJuego, setPreguntasJuego] = useState([]);
  const [preguntaActualIndex, setPreguntaActualIndex] = useState(0);
  const [respuestaSeleccionada, setRespuestaSeleccionada] = useState(null);
  const [comprobado, setComprobado] = useState(false);
  const [indiceCorrectaMezclada, setIndiceCorrectaMezclada] = useState(null);
  const [opcionesMezcladas, setOpcionesMezcladas] = useState([]);
  
  // NUEVO ESTADO: Guarda los resultados del mapa { index, resultado: 'correcto' | 'incorrecto' | null }
  const [resultadosMapa, setResultadosMapa] = useState([]); 

  // Estados formulario
  const [nuevaPregunta, setNuevaPregunta] = useState("");
  const [opcionesForm, setOpcionesForm] = useState(["", "", "", ""]);
  const [respuestaCorrectaInput, setRespuestaCorrectaInput] = useState(1);
  const [temaInput, setTemaInput] = useState(listaTemas[0]);

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
    
    setPaginaActual('juego');
    prepararPregunta(0);
  };

  const seleccionarTema = (tema) => {
    const preguntasTema = todasLasPreguntas.filter(p => p.tema === tema);
    iniciarJuego(preguntasTema);
  };

  // NUEVO: Lógica de comprobación
  const comprobarRespuesta = () => {
    setComprobado(true);
    const esCorrecta = respuestaSeleccionada === indiceCorrectaMezclada;

    // Actualizar el estado del mapa
    setResultadosMapa(prev => prev.map(item => 
      item.index === preguntaActualIndex 
        ? { ...item, resultado: esCorrecta ? 'correcto' : 'incorrecto' } 
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

  if (loading) return <div className="menu-container">Cargando...</div>;
  
  if (paginaActual === 'menu') {
    return (
      <div className="menu-container">
        <h1>MIR App Estudio</h1>
        <div className="menu-botones">
          <button onClick={() => iniciarJuego(todasLasPreguntas)}>Preguntas Aleatorias (50)</button>
          <button onClick={() => setPaginaActual('temas')}>Elegir Tema</button>
          <button onClick={() => setPaginaActual('administrar')}>Administrar</button>
        </div>
      </div>
    );
  }

  if (paginaActual === 'temas') {
    return (
      <div className="menu-container">
        <h2>Selecciona un Tema</h2>
        <div className="menu-botones">
          {listaTemas.map(tema => (
            <button key={tema} onClick={() => seleccionarTema(tema)}>{tema}</button>
          ))}
          <button className="boton-volver" onClick={() => setPaginaActual('menu')}>Volver</button>
        </div>
      </div>
    );
  }

  if (paginaActual === 'juego') {
    const preguntaActual = preguntasJuego[preguntaActualIndex];
    if (!preguntaActual) return <div className="menu-container">No hay preguntas.</div>;

    return (
      <div className="app-container">
        {/* --- MAPA DE PREGUNTAS (PANEL IZQUIERDO) --- */}
        <div className="panel-lateral">
          <h3>Mapa</h3>
          <div className="mapa-preguntas">
            {resultadosMapa.map((item, index) => {
              // Determinar clase basada en el resultado
              let claseMapa = "boton-mapa";
              if (item.resultado === 'correcto') claseMapa += " correcto";
              if (item.resultado === 'incorrecto') claseMapa += " incorrecto";
              if (preguntaActualIndex === index) claseMapa += " activo";

              return (
                <button 
                  key={index} 
                  className={claseMapa}
                  onClick={() => prepararPregunta(index)}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          <button className="boton-volver" onClick={() => setPaginaActual('menu')}>Salir</button>
        </div>

        {/* --- ÁREA DE LA PREGUNTA --- */}
        <div className="examen-container">
          <div className="area-pregunta">
            <div className="progreso">
              <span>Pregunta {preguntaActualIndex + 1} / {preguntasJuego.length}</span>
              <span>{preguntaActual.tema}</span>
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
              {/* --- BOTÓN COMPROBAR ACTUALIZADO --- */}
              <button className="btn-primary" onClick={comprobarRespuesta} disabled={!respuestaSeleccionada || comprobado}>Comprobar</button>
              
              <button className="btn-primary" onClick={() => {
                if (preguntaActualIndex < preguntasJuego.length - 1) {
                  prepararPregunta(preguntaActualIndex + 1);
                }
              }} disabled={!comprobado}>Siguiente</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (paginaActual === 'administrar') {
    return (
      <div className="menu-container">
        <h2>Administrar</h2>
        <form onSubmit={agregarPregunta} className="formulario-pregunta">
          <label>Tema</label>
          <select value={temaInput} onChange={e => setTemaInput(e.target.value)}>
            {listaTemas.map(tema => <option key={tema} value={tema}>{tema}</option>)}
          </select>
          <textarea placeholder="Pregunta..." value={nuevaPregunta} onChange={e => setNuevaPregunta(e.target.value)} required />
          {opcionesForm.map((op, i) => (
            <input key={i} type="text" placeholder={`Opción ${String.fromCharCode(65 + i)}`} value={op} onChange={e => {
              const nuevasOpciones = [...opcionesForm];
              nuevasOpciones[i] = e.target.value;
              setOpcionesForm(nuevasOpciones);
            }} required />
          ))}
          <label>Correcta (1-4)</label>
          <input type="number" min="1" max="4" value={respuestaCorrectaInput} onChange={e => setRespuestaCorrectaInput(e.target.value)} required />
          <button type="submit" className="btn-primary">Guardar</button>
          <button type="button" className="btn-secondary" onClick={() => setPaginaActual('menu')}>Volver</button>
        </form>
      </div>
    );
  }
  return null;
}
export default App