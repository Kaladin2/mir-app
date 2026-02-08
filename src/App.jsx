import { useState, useEffect, useRef } from 'react'
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
  const [añoInput, setAñoInput] = useState("");
  const [numeroPreguntaInput, setNumeroPreguntaInput] = useState("");

  // --- ESTADO Y REFERENCIAS DE AUDIO ---
  const [musicaReproduciendo, setMusicaReproduciendo] = useState(false);
  // Referencia para la música de fondo - Asegúrate de tener 'musica.mp3' en /public
  const audioRef = useRef(new Audio('/musica.mp3')); 
  // Referencia para el sonido especial - Asegúrate de tener 'redstag.wav' en /public
  const audioEspecialRef = useRef(new Audio('/redstag.wav'));
  const temporizadorRef = useRef(null);

  const listaTemas = [
    "Cardiologia", "Traumatologia", "Nefrologia/Urologia", "Pediatria", 
    "Farmacologia", "Ginecologia", "Digestivo", "Respiratorio", 
    "Oncologia", "Geriatria", "Urgencias y Emergencias", "Psiquiatria", 
    "Investigacion", "UCI", "Endocrinologia"
  ];
  const listaAños = ["2020", "2021", "2022", "2023", "2024", "2025"];

  useEffect(() => {
    fetchPreguntas();
    setTemaInput(listaTemas[0]);
    setAñoInput(listaAños[0]);
    
    // Configurar audio de fondo
    const audio = audioRef.current;
    audio.loop = true;
    audio.volume = 0.3; 
  }, []);

  // --- LÓGICA DE MÚSICA (PAUSA AUTOMÁTICA EN JUEGO) ---
  useEffect(() => {
    const audio = audioRef.current;
    
    if (paginaActual === 'juego') {
      audio.pause();
      setMusicaReproduciendo(false);
    } 
    else if (musicaReproduciendo) {
      audio.play().catch(e => console.log("Espera interacción usuario"));
    }
    
    return () => audio.pause();
  }, [paginaActual]);

  const alternarMusica = () => {
    const audio = audioRef.current;
    if (musicaReproduciendo) {
      audio.pause();
    } else {
      audio.play().catch(e => console.log("Error reproducción", e));
    }
    setMusicaReproduciendo(!musicaReproduciendo);
  };
  // ---------------------------------------------

  // --- LÓGICA BOTÓN ESPECIAL (5 SEGUNDOS) ---
  const iniciarTemporizador = () => {
    temporizadorRef.current = setTimeout(() => {
      audioEspecialRef.current.play().catch(e => console.log("Error audio especial", e));
    }, 5000);
  };

  const cancelarTemporizador = () => {
    clearTimeout(temporizadorRef.current);
  };
  // ---------------------------------------------

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
    const resultadoGuardado = resultadosMapa[index];
    setRespuestaSeleccionada(resultadoGuardado?.respuestaUsuario || null);
    if (modoJuego === 'practica') {
        setComprobado(resultadoGuardado?.resultado !== null);
    } else {
        setComprobado(examenFinalizado);
    }
    setPreguntaActualIndex(index);
  };

  const iniciarJuego = (preguntasSeleccionadas) => {
    if (preguntasSeleccionadas.length === 0) {
      alert("No hay preguntas disponibles");
      return;
    }
    const mezcladas = [...preguntasSeleccionadas].sort(() => 0.5 - Math.random());
    const seleccionadas = mezcladas.slice(0, 50);
    const preguntasConOpcionesMezcladas = seleccionadas.map(pregunta => {
        const opcionesOriginales = [pregunta.opcionA, pregunta.opcionB, pregunta.opcionC, pregunta.opcionD];
        const textoCorrectoOriginal = opcionesOriginales[pregunta.correcta - 1];
        let opcionesParaMezclar = opcionesOriginales.map((texto, i) => ({ texto: texto, originalIndex: i + 1 }));
        for (let i = opcionesParaMezclar.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [opcionesParaMezclar[i], opcionesParaMezclar[j]] = [opcionesParaMezclar[j], opcionesParaMezclar[i]];
        }
        return {
            ...pregunta,
            opcionesMezcladas: opcionesParaMezclar.map(o => o.texto),
            indiceCorrectaMezclada: opcionesParaMezclar.findIndex(o => o.texto === textoCorrectoOriginal) + 1
        };
    });
    setPreguntasJuego(preguntasConOpcionesMezcladas);
    setResultadosMapa(preguntasConOpcionesMezcladas.map((_, i) => ({ index: i, resultado: null, respuestaUsuario: null })));
    setCorrectas(0);
    setIncorrectas(0);
    setEnBlanco(0);
    setExamenFinalizado(false);
    setPaginaActual('juego');
    prepararPregunta(0);
  };

  const manejarSiguiente = () => {
    setResultadosMapa(prev => prev.map(item => 
        item.index === preguntaActualIndex ? { ...item, respuestaUsuario: respuestaSeleccionada } : item
    ));
    if (preguntaActualIndex < preguntasJuego.length - 1) {
        prepararPregunta(preguntaActualIndex + 1);
    }
  };

  const comprobarRespuestaPractica = () => {
    setComprobado(true);
    let resultado = 'incorrecto';
    const preguntaActual = preguntasJuego[preguntaActualIndex];
    if (respuestaSeleccionada === null) {
      resultado = 'blanco';
      setEnBlanco(prev => prev + 1);
    } else {
      const esCorrecta = respuestaSeleccionada === preguntaActual.indiceCorrectaMezclada;
      if (esCorrecta) {
        resultado = 'correcto';
        setCorrectas(prev => prev + 1);
      } else {
        resultado = 'incorrecto';
        setIncorrectas(prev => prev + 1);
      }
    }
    setResultadosMapa(prev => prev.map(item => 
      item.index === preguntaActualIndex ? { ...item, resultado: resultado, respuestaUsuario: respuestaSeleccionada } : item
    ));
  };
  
  const finalizarExamen = () => {
      let corr = 0; let inc = 0; let bla = 0;
      const nuevosResultados = resultadosMapa.map((item, index) => {
          const pregunta = preguntasJuego[index];
          let res = 'blanco';
          if (item.respuestaUsuario === null) { bla++; } 
          else if (item.respuestaUsuario === pregunta.indiceCorrectaMezclada) { res = 'correcto'; corr++; } 
          else { res = 'incorrecto'; inc++; }
          return { ...item, resultado: res };
      });
      setResultadosMapa(nuevosResultados);
      setCorrectas(corr); setIncorrectas(inc); setEnBlanco(bla);
      setExamenFinalizado(true); setComprobado(true);
      alert(`Examen finalizado.\nCorrectas: ${corr}\nIncorrectas: ${inc}\nEn Blanco: ${bla}`);
  };

  const copiarPregunta = () => {
      const pregunta = preguntasJuego[preguntaActualIndex];
      if (!pregunta) return;
      const textoACopiar = `${pregunta.pregunta}\n\n` +
                          `A) ${pregunta.opcionA}\n` +
                          `B) ${pregunta.opcionB}\n` +
                          `C) ${pregunta.opcionC}\n` +
                          `D) ${pregunta.opcionD}`;
      navigator.clipboard.writeText(textoACopiar)
          .then(() => alert("Pregunta copiada al portapapeles"))
          .catch(err => console.error("Error al copiar: ", err));
  };

  const agregarPregunta = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from('preguntas')
      .insert([{ 
          pregunta: nuevaPregunta,
          opcionA: opcionesForm[0], opcionB: opcionesForm[1],
          opcionC: opcionesForm[2], opcionD: opcionesForm[3],
          correcta: parseInt(respuestaCorrectaInput),
          tema: temaInput, explicacion: explicacionInput,
          año: añoInput, numeroPregunta: numeroPreguntaInput
        }]);
    if (error) { alert("Error al guardar: " + error.message); } 
    else {
      alert("Pregunta añadida");
      setNuevaPregunta(""); setOpcionesForm(["", "", "", ""]);
      setRespuestaCorrectaInput(1); setExplicacionInput("");
      setAñoInput(listaAños[0]); setNumeroPreguntaInput("");
      fetchPreguntas();
    }
  };

  const verificarAdmin = () => {
    const password = prompt("Ingrese contraseña:");
    if (password === "91127") { setPaginaActual('administrar'); } 
    else { alert("Contraseña incorrecta"); }
  };

  if (loading) return <div className="app-container">Cargando...</div>;

  // --- RENDERIZADO DE VISTAS ---
  return (
    <>
      {/* Botón música */}
      {paginaActual !== 'juego' && (
        <button onClick={alternarMusica} className="boton-musica">
          {musicaReproduciendo ? "⏸" : "▶"}
        </button>
      )}

      {paginaActual === 'menu' && (
        <div className="app-container menu-fondo">
          <div className="menu-box">
            <header className="app-header">
              
              {/* --- IMAGEN-BOTÓN ESPECIAL --- */}
              <div className="contenedor-imagen-boton">
                <img 
                  src="/ciervo.png" 
                  alt="Botón Especial" 
                  className="imagen-boton-especial"
                  onMouseDown={iniciarTemporizador}
                  onMouseUp={cancelarTemporizador}
                  onMouseLeave={cancelarTemporizador}
                  onTouchStart={iniciarTemporizador}
                  onTouchEnd={cancelarTemporizador}
                />
              </div>
              {/* ------------------------------ */}

              <h1>Centro de Entrenamiento MIR</h1>
            </header>
            <div className="menu-botones">
              <button onClick={() => setPaginaActual('modo')} className="menu-btn primary">Iniciar Test</button>
              <button onClick={verificarAdmin} className="menu-btn tertiary">Administrador</button>
            </div>
          </div>
        </div>
      )}
      
      {paginaActual === 'modo' && (
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
      )}

      {paginaActual === 'modo-tipo' && (
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
      )}

      {paginaActual === 'temas' && (
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
      )}

      {paginaActual === 'juego' && (
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
                return <button key={index} className={claseMapa} onClick={() => prepararPregunta(index)}>{index + 1}</button>
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
                <div style={{display: 'flex', alignItems: 'center'}}>
                  <span>Pregunta {preguntaActualIndex + 1} / {preguntasJuego.length}</span>
                  <button onClick={copiarPregunta} className="boton-copiar" style={{marginLeft: '15px', background: 'transparent', border: '1px solid #666', color: '#aaa', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '0.8rem'}}>
                    Copiar pregunta
                  </button>
                </div>
                <span className="tema-badge">{preguntasJuego[preguntaActualIndex]?.tema} ({modoJuego})</span>
              </div>
              <div className="referencia-pregunta" style={{color: '#fff', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '15px', marginTop: '-5px'}}>
                  {preguntasJuego[preguntaActualIndex]?.año} - Pregunta {preguntasJuego[preguntaActualIndex]?.numeroPregunta}
              </div>
              <h2>{preguntasJuego[preguntaActualIndex]?.pregunta}</h2>
              <div className="opciones-container">
                {preguntasJuego[preguntaActualIndex]?.opcionesMezcladas.map((opcion, index) => {
                  let claseBoton = "boton-opcion";
                  if (comprobado || examenFinalizado) {
                    if (index + 1 === preguntasJuego[preguntaActualIndex]?.indiceCorrectaMezclada) claseBoton += " correcto";
                    else if (index + 1 === respuestaSeleccionada) claseBoton += " incorrecto";
                  } else if (respuestaSeleccionada === index + 1) { claseBoton += " seleccionado"; }
                  return (
                    <button key={index} className={claseBoton} onClick={() => {
                      if(!comprobado && !examenFinalizado) {
                          setRespuestaSeleccionada(respuestaSeleccionada === index + 1 ? null : index + 1);
                      }
                    }}>
                      <span className="letra-opcion">{String.fromCharCode(65 + index)}</span>
                      {opcion}
                    </button>
                  );
                })}
              </div>
              {(comprobado || examenFinalizado) && preguntasJuego[preguntaActualIndex]?.explicacion && (
                  <div className="area-explicacion">
                      <h4>Explicación:</h4>
                      <p>{preguntasJuego[preguntaActualIndex]?.explicacion}</p>
                  </div>
              )}
              <div className="footer-pregunta">
                {modoJuego === 'practica' && (
                  <button className="btn-primary" onClick={comprobarRespuestaPractica} disabled={comprobado}>
                    {respuestaSeleccionada === null ? 'Mostrar Respuesta' : 'Comprobar'}
                  </button>
                )}
                <button className="btn-next" onClick={manejarSiguiente} disabled={examenFinalizado}>Siguiente</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {paginaActual === 'administrar' && (
        <div className="app-container">
          <button onClick={() => setPaginaActual('menu')} className="boton-volver">⬅ Volver</button>
          <h2>Administrar Preguntas</h2>
          <form onSubmit={agregarPregunta} className="formulario-pregunta">
            <label>Tema</label>
            <select value={temaInput} onChange={e => setTemaInput(e.target.value)}>
              {listaTemas.map(tema => <option key={tema} value={tema}>{tema}</option>)}
            </select>
            <div style={{display: 'flex', gap: '10px'}}>
                <div style={{flex: 1}}>
                    <label>Año</label>
                    <select value={añoInput} onChange={e => setAñoInput(e.target.value)} required style={{width: '100%', padding: '10px'}}>
                      {listaAños.map(año => <option key={año} value={año}>{año}</option>)}
                    </select>
                </div>
                <div style={{flex: 1}}>
                    <label>Nº Pregunta</label>
                    <input type="text" placeholder="Ej. 12" value={numeroPreguntaInput} onChange={e => setNumeroPreguntaInput(e.target.value)} required style={{width: '100%'}}/>
                </div>
            </div>
            <textarea placeholder="Enunciado de la pregunta..." value={nuevaPregunta} onChange={e => setNuevaPregunta(e.target.value)} required />
            {opcionesForm.map((op, i) => (
              <input key={i} type="text" placeholder={`Opción ${String.fromCharCode(65 + i)}`} value={op} onChange={e => {
                const nuevasOpciones = [...opcionesForm];
                nuepciones[i] = e.target.value;
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
      )}
    </>
  );
}
export default App;