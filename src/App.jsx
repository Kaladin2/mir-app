import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

function App() {
  const [todasLasPreguntas, setTodasLasPreguntas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paginaActual, setPaginaActual] = useState('menu'); 

  // --- ESTADO DEL JUEGO ---
  const [preguntasJuego, setPreguntasJuego] = useState([]);
  const [preguntaActualIndex, setPreguntaActualIndex] = useState(0);
  const [respuestaSeleccionada, setRespuestaSeleccionada] = useState(null);
  const [comprobado, setComprobado] = useState(false);
  
  // --- CAMBIO AQUÍ: Ahora estos estados son cruciales ---
  const [indiceCorrectaMezclada, setIndiceCorrectaMezclada] = useState(null);
  const [opcionesMezcladas, setOpcionesMezcladas] = useState([]);
  // ------------------------------------------------------
  
  const [resultadosMapa, setResultadosMapa] = useState([]); 
  const [modoJuego, setModoJuego] = useState('practica'); 
  const [examenFinalizado, setExamenFinalizado] = useState(false);

  // --- CONTADORES ---
  const [correctas, setCorrectas] = useState(0);
  const [incorrectas, setIncorrectas] = useState(0);
  const [enBlanco, setEnBlanco] = useState(0);

  // --- ESTADOS FORMULARIO ADMINISTRADOR ---
  const [nuevaPregunta, setNuevaPregunta] = useState("");
  const [opcionesForm, setOpcionesForm] = useState(["", "", "", ""]);
  const [respuestaCorrectaInput, setRespuestaCorrectaInput] = useState(1);
  const [temaInput, setTemaInput] = useState("");
  const [explicacionInput, setExplicacionInput] = useState("");

  const listaTemas = [
    "Cardiologia", "Traumatologia", "Nefrologia/Urologia", "Pediatria", 
    "Farmacologia", "Ginecologia", "Digestivo", "Respiratorio", 
    "Oncologia", "Geriatria", "Urgencias y Emergencias", "Psiquiatria", 
    "Investigacion", "UCI", "Endocrinologia"
  ];

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
  
  // --- CAMBIO SIGNIFICATIVO AQUÍ ---
  const prepararPregunta = (index) => {
    const pregunta = preguntasJuego[index];
    if (!pregunta) return;
    
    // 1. Obtener opciones originales
    const opcionesOriginales = [pregunta.opcionA, pregunta.opcionB, pregunta.opcionC, pregunta.opcionD];
    const textoCorrectoOriginal = opcionesOriginales[pregunta.correcta - 1];

    // 2. Crear un array de objetos para mezclar manteniendo la referencia de cuál es correcta
    let opcionesParaMezclar = opcionesOriginales.map((texto, i) => ({
        texto: texto,
        originalIndex: i + 1
    }));

    // 3. Fisher-Yates shuffle para mezclar solo estas opciones
    for (let i = opcionesParaMezclar.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opcionesParaMezclar[i], opcionesParaMezclar[j]] = [opcionesParaMezclar[j], opcionesParaMezclar[i]];
    }

    // 4. Actualizar estados con las opciones mezcladas de ESTA pregunta
    setOpcionesMezcladas(opcionesParaMezclar.map(o => o.texto));
    
    // 5. Encontrar cuál es la nueva posición de la respuesta correcta
    const nuevaPosicionCorrecta = opcionesParaMezclar.findIndex(o => o.texto === textoCorrectoOriginal) + 1;
    setIndiceCorrectaMezclada(nuevaPosicionCorrecta);
    
    // Resetear estados de respuesta para la nueva pregunta
    const respuestaGuardada = resultadosMapa[index]?.respuestaUsuario;
    setRespuestaSeleccionada(respuestaGuardada || null);
    setComprobado(resultadosMapa[index]?.resultado !== null);
    
    setPreguntaActualIndex(index);
  };
  // ----------------------------------

  const iniciarJuego = (preguntasSeleccionadas) => {
    if (preguntasSeleccionadas.length === 0) {
      alert("No hay preguntas disponibles");
      return;
    }
    const mezcladas = [...preguntasSeleccionadas].sort(() => 0.5 - Math.random());
    const seleccionadas = mezcladas.slice(0, 50);
    setPreguntasJuego(seleccionadas);
    
    setResultadosMapa(seleccionadas.map((_, i) => ({ index: i, resultado: null, respuestaUsuario: null })));
    
    setCorrectas(0);
    setIncorrectas(0);
    setEnBlanco(0);
    setExamenFinalizado(false);
    
    setPaginaActual('juego');
    prepararPregunta(0);
  };

  const manejarSiguiente = () => {
    setResultadosMapa(prev => prev.map(item => 
        item.index === preguntaActualIndex 
          ? { ...item, respuestaUsuario: respuestaSeleccionada } 
          : item
    ));

    if (preguntaActualIndex < preguntasJuego.length - 1) {
        prepararPregunta(preguntaActualIndex + 1);
    }
  };

  const comprobarRespuestaPractica = () => {
    setComprobado(true);
    let resultado = 'incorrecto';
    
    if (respuestaSeleccionada === null) {
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

    setResultadosMapa(prev => prev.map(item => 
      item.index === preguntaActualIndex 
        ? { ...item, resultado: resultado, respuestaUsuario: respuestaSeleccionada } 
        : item
    ));
  };
  
  const finalizarExamen = () => {
      let corr = 0;
      let inc = 0;
      let bla = 0;

      const nuevosResultados = resultadosMapa.map((item, index) => {
          const pregunta = preguntasJuego[index];
          
          // Re-calcular basado en la respuesta original
          let res = 'blanco';
          if (item.respuestaUsuario === null) {
              bla++;
          } else if (item.respuestaUsuario === pregunta.correcta) { // AQUÍ ESTABA EL ERROR: Usar pregunta.correcta original
              res = 'correcto';
              corr++;
          } else {
              res = 'incorrecto';
              inc++;
          }
          return { ...item, resultado: res };
      });
      
      setResultadosMapa(nuevosResultados);
      setCorrectas(corr);
      setIncorrectas(inc);
      setEnBlanco(bla);
      setExamenFinalizado(true);
      setComprobado(true);
      alert(`Examen finalizado.\nCorrectas: ${corr}\nIncorrectas: ${inc}\nEn Blanco: ${bla}`);
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
          tema: temaInput,
          explicacion: explicacionInput
        },
      ]);

    if (error) {
      alert("Error al guardar: " + error.message);
    } else {
      alert("Pregunta añadida");
      setNuevaPregunta("");
      setOpcionesForm(["", "", "", ""]);
      setRespuestaCorrectaInput(1);
      setExplicacionInput("");
      fetchPreguntas();
    }
  };

  const verificarAdmin = () => {
    const password = prompt("Ingrese la contraseña de administrador:");
    if (password === "91127") {
      setPaginaActual('administrar');
    } else {
      alert("Contraseña incorrecta");
    }
  };

  if (loading) return <div className="app-container">Cargando...</div>;

  // --- RENDERIZADO DE VISTAS ---

  if (paginaActual === 'menu') {
    return (
      <div className="app-container">
        <div className="menu-box">
          <header className="app-header">
            <h1>Centro de Entrenamiento MIR</h1>
          </header>
          <div className="menu-botones">
            <button onClick={() => setPaginaActual('modo')} className="menu-btn primary">Iniciar Test</button>
            <button onClick={verificarAdmin} className="menu-btn tertiary">Administrador</button>
          </div>
        </div>
      </div>
    );
  }
  
  if (paginaActual === 'modo') {
      return (
          <div className="app-container">
              <div className="menu-box">
                  <h2>Selecciona el Modo</h2>
                  <div className="menu-botones">
                      <button onClick={() => { setModoJuego('practica'); setPaginaActual('modo-tipo'); }} className="menu-btn primary">Modo Práctica</button>
                      <button onClick={() => { setModoJuego('examen'); setPaginaActual('modo-tipo'); }} className="menu-btn secondary">Modo Examen</button>
                      <button onClick={() => setPaginaActual('menu')} className="boton-volver">Volver</button>
                  </div>
              </div>
          </div>
      );
  }

  if (paginaActual === 'modo-tipo') {
      return (
          <div className="app-container">
              <div className="menu-box">
                  <h2>¿Qué quieres estudiar?</h2>
                  <div className="menu-botones">
                      <button onClick={() => iniciarJuego(todasLasPreguntas)} className="menu-btn primary">Preguntas Aleatorias (50)</button>
                      <button onClick={() => setPaginaActual('temas')} className="menu-btn secondary">Elegir Tema</button>
                      <button onClick={() => setPaginaActual('modo')} className="boton-volver">Volver</button>
                  </div>
              </div>
          </div>
      );
  }

  if (paginaActual === 'temas') {
    return (
      <div className="app-container">
        <button onClick={() => setPaginaActual('modo-tipo')} className="boton-volver">⬅ Volver</button>
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

  if (paginaActual === 'juego') {
    const preguntaActual = preguntasJuego[preguntaActualIndex];
    if (!preguntaActual) return <div className="app-container">No hay preguntas en este tema.</div>;

    return (
      <div className="app-container" style={{flexDirection: 'row', alignItems: 'flex-start'}}>
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
          
          {modoJuego === 'examen' && !examenFinalizado && (
              <button onClick={finalizarExamen} className="btn-primary" style={{marginTop: '10px'}}>Verificar Examen</button>
          )}
        </div>

        <div className="examen-container">
          <div className="area-pregunta">
            <div className="progreso">
              <span>Pregunta {preguntaActualIndex + 1} / {preguntasJuego.length}</span>
              <span className="tema-badge">{preguntaActual.tema} ({modoJuego})</span>
            </div>
            <h2>{preguntaActual.pregunta}</h2>
            <div className="opciones-container">
              {opcionesMezcladas.map((opcion, index) => {
                let claseBoton = "boton-opcion";
                
                if (comprobado || examenFinalizado) {
                  if (index + 1 === indiceCorrectaMezclada) claseBoton += " correcto";
                  else if (index + 1 === respuestaSeleccionada) claseBoton += " incorrecto";
                } else if (respuestaSeleccionada === index + 1) {
                  claseBoton += " seleccionado";
                }
                
                return (
                  <button key={index} className={claseBoton} onClick={() => {
                    if(!comprobado && !examenFinalizado) {
                        if (respuestaSeleccionada === index + 1) {
                            setRespuestaSeleccionada(null);
                        } else {
                            setRespuestaSeleccionada(index + 1);
                        }
                    }
                  }}>
                    <span className="letra-opcion">{String.fromCharCode(65 + index)}</span>
                    {opcion}
                  </button>
                );
              })}
            </div>

            {(comprobado || examenFinalizado) && preguntaActual.explicacion && (
                <div className="area-explicacion">
                    <h4>Explicación:</h4>
                    <p>{preguntaActual.explicacion}</p>
                </div>
            )}

            <div className="footer-pregunta">
              {modoJuego === 'practica' && (
                <button className="btn-primary" onClick={comprobarRespuestaPractica} disabled={comprobado}>
                  {respuestaSeleccionada === null ? 'Mostrar Respuesta' : 'Comprobar'}
                </button>
              )}
              
              <button className="btn-next" onClick={manejarSiguiente} disabled={examenFinalizado || (modoJuego === 'practica' && !comprobado)}>
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          
          <label>Explicación</label>
          <textarea placeholder="Por qué esta respuesta es correcta..." value={explicacionInput} onChange={e => setExplicacionInput(e.target.value)} />

          <button type="submit" className="btn-primary">Guardar Pregunta</button>
        </form>
      </div>
    );
  }

  return null;
}
export default App;