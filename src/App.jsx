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
  const audioRef = useRef(new Audio('/musica.mp3')); 
  const audioEspecialRef = useRef(new Audio('/redstag.wav'));
  const temporizadorRef = useRef(null);
  
  // --- NUEVO: ESTADOS DE LAS CUENTAS ATRÁS Y ARCHIVOS ---
  const [tiempos, setTiempos] = useState({
    ct1: "",
    ct2: "",
    ct3: ""
  });
  const [checks, setChecks] = useState({
    check1: false,
    check2: false,
    check3: false
  });
  
  // Referencias a archivos en /public
  const audioBucleRef = useRef(new Audio('/bucle_audio.mp3'));
  // --------------------------------------------------------

  // --- ESTADO PARA EL CÓDIGO (PLAN B) ---
  const [codigoInput, setCodigoInput] = useState("");
  const [codigoCorrecto, setCodigoCorrecto] = useState(false);
  
  // --- NUEVO: ESTADO PARA EL VIDEO DE FONDO ---
  const [mostrarVideoFondo, setMostrarVideoFondo] = useState(false);
  // ---------------------------------------------

  const listaTemas = [
    "Cardiologia", "Traumatologia", "Nefrologia/Urologia", "Pediatria", 
    "Farmacologia", "Ginecologia", "Digestivo", "Respiratorio", 
    "Oncologia", "Geriatria", "Urgencias y Emergencias", "Psiquiatria", 
    "Investigacion", "UCI", "Endocrinologia", "Familia"
  ];
  const listaAños = ["2020", "2021", "2022", "2023", "2024", "2025", "2026"];

  useEffect(() => {
    fetchPreguntas();
    setTemaInput(listaTemas[0]);
    setAñoInput(listaAños[0]);
    
    const audio = audioRef.current;
    audio.loop = true;
    audio.volume = 0.3;

    // Configurar audio bucle local - VOLUMEN A LA MITAD (0.5)
    audioBucleRef.current.loop = true;
    audioBucleRef.current.volume = 0.5;
  }, []);

  // --- LÓGICA DE MÚSICA (PAUSA AUTOMÁTICA EN JUEGO) ---
  useEffect(() => {
    const audio = audioRef.current;
    
    if (paginaActual === 'juego' || paginaActual === 'sorpresa') {
      audio.pause();
      setMusicaReproduciendo(false);
    } 
    else if (musicaReproduciendo) {
      audio.play().catch(e => console.log("Espera interacción usuario"));
    }
    
    return () => audio.pause();
  }, [paginaActual]);

  // --- LÓGICA DE LAS 3 CUENTAS ATRÁS SECUENCIALES ---
  useEffect(() => {
    if (paginaActual !== 'sorpresa') return; 

    // --- FECHAS OBJETIVO ---
    const f1 = new Date("August 30, 2026 00:00:00").getTime();
    const f2 = new Date("August 30, 2027 00:00:00").getTime();
    const f3 = new Date("September 11, 2027 00:00:00").getTime();

    const intervalo = setInterval(() => {
      const ahora = new Date().getTime();
      
      const dist1 = f1 - ahora;
      const dist2 = f2 - ahora;
      const dist3 = f3 - ahora;

      // Actualizar tiempos en pantalla
      setTiempos({
        ct1: dist1 > 0 ? formatearDistancia(dist1) : "¡LLEGÓ EL DÍA!",
        ct2: dist2 > 0 ? formatearDistancia(dist2) : "¡LLEGÓ EL DÍA!",
        ct3: dist3 > 0 ? formatearDistancia(dist3) : "¡LLEGÓ EL DÍA!"
      });

      // --- ACCIONES SECUENCIALES AUTOMÁTICAS ---

      // 1. Termina cuenta 1 -> Suena audio bucle
      if (dist1 <= 0 && !checks.check1) {
        setChecks(prev => ({...prev, check1: true}));
        audioBucleRef.current.play().catch(e => console.log("Audio bucle bloqueado"));
      }
      
      // 2. Termina cuenta 2 -> Se activa VIDEO DE FONDO
      if (dist2 <= 0 && checks.check1 && !checks.check2) {
        setChecks(prev => ({...prev, check2: true}));
        audioBucleRef.current.pause(); 
        setMostrarVideoFondo(true); // Activa el video de fondo
      }
      
      // 3. Termina cuenta 3 -> Habilitar botón sorpresa final
      if (dist3 <= 0 && checks.check2 && !checks.check3) {
        setChecks(prev => ({...prev, check3: true}));
        // Ya no abrimos automáticamente ni usamos código aquí
      }

    }, 1000);

    return () => clearInterval(intervalo); 
  }, [paginaActual, checks]);

  const formatearDistancia = (distancia) => {
    const dias = Math.floor(distancia / (1000 * 60 * 60 * 24));
    const horas = Math.floor((distancia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutos = Math.floor((distancia % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((distancia % (1000 * 60)) / 1000);
    return `${dias}d : ${horas}h : ${minutos}m : ${segundos}s`;
  }

  // --- LÓGICA DEL CÓDIGO (CONTROLADOR DE FASES) ---
  const comprobarCodigo = () => {
    
    // 1. REINICIAR: Vuelve a la fase inicial y limpia todo
    if (codigoInput.toLowerCase() === "reiniciar") {
        setChecks({ check1: false, check2: false, check3: false });
        audioBucleRef.current.pause();
        audioBucleRef.current.currentTime = 0;
        setMostrarVideoFondo(false);
        setCodigoCorrecto(false);
        setCodigoInput("");
        alert("Sistema reiniciado.");
        return;
    }

    // 2. AVANZAR FASE (ADMIN)
    if (codigoInput.toLowerCase() === "sombrasdeidentidad") {
      if (!checks.check1) {
          setChecks(prev => ({...prev, check1: true}));
          audioBucleRef.current.play().catch(e => console.log("Audio bucle bloqueado"));
          alert("Fase 1 activada.");
      } else if (checks.check1 && !checks.check2) {
          setChecks(prev => ({...prev, check2: true}));
          audioBucleRef.current.pause();
          setMostrarVideoFondo(true);
          alert("Fase 2 activada.");
      } else if (checks.check2 && !checks.check3) {
          setChecks(prev => ({...prev, check3: true}));
          setMostrarVideoFondo(false);
          alert("Fase 3 activada.");
      }
      setCodigoInput("");
      return;
    }
    
    // 3. CÓDIGO PRODUCCIÓN (Plan B)
    if (codigoInput === "91127") {
        if (checks.check3) {
            setCodigoCorrecto(true);
        } else {
            alert("Aún no es el momento.");
        }
    } else {
      alert("Código incorrecto");
    }
    setCodigoInput("");
  };

  const abrirVideoEnlace = () => {
    window.open("https://www.youtube.com/watch?v=1goAp0XmhZQ", "_blank");
  };
  // ---------------------------------------------

  const alternarMusica = () => {
    const audio = audioRef.current;
    if (musicaReproduciendo) {
      audio.pause();
    } else {
      audio.play().catch(e => console.log("Error reproducción", e));
    }
    setMusicaReproduciendo(!musicaReproduciendo);
  };

  const iniciarTemporizador = () => {
    temporizadorRef.current = setTimeout(() => {
      audioEspecialRef.current.play().then(() => {
        audioEspecialRef.current.onended = () => {
            setPaginaActual('sorpresa');
        };
      }).catch(e => console.log("Error audio especial", e));
    }, 5000);
  };

  const cancelarTemporizador = () => {
    clearTimeout(temporizadorRef.current);
  };

  async function fetchPreguntas() {
    setLoading(true);
    const { data, error } = await supabase
      .from('preguntas')
      .select('*');
    
    if (error) console.log('Error cargando:', error);
    else setTodasLasPreguntas(data || []);
    setLoading(false);
  }

  // --- LÓGICA DE JUEGO (Igual) ---
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
      {paginaActual !== 'juego' && paginaActual !== 'sorpresa' && (
        <button onClick={alternarMusica} className="boton-musica">
          {musicaReproduciendo ? "⏸" : "▶"}
        </button>
      )}

      {/* --- VIDEO DE FONDO --- */}
      {mostrarVideoFondo && (
          <video autoPlay loop muted className="video-fondo">
              <source src="/bucle_video.mp4" type="video/mp4" />
          </video>
      )}
      {/* ----------------------- */}

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
      
      {/* --- VISTA SORPRESA ACTUALIZADA --- */}
      {paginaActual === 'sorpresa' && (
        <div className={`app-container ${mostrarVideoFondo ? 'sin-fondo' : 'menu-fondo'}`}>
          <div className={`contenedor-final ${mostrarVideoFondo ? 'transparente' : ''}`}>
            <h2>Sorpresa</h2>
            
            {/* --- LISTA DE CUENTAS ATRÁS (Solo números) --- */}
            <div className="lista-cuentas">
                {/* Cuenta 1 */}
                <div className="fila-cuenta">
                    {checks.check1 ? <strong>CUMPLIDO</strong> : 
                     !checks.check1 && !checks.check2 && !checks.check3 ? <span>{tiempos.ct1}</span> : <span>*************</span>
                    }
                </div>
                
                {/* Cuenta 2 */}
                <div className="fila-cuenta">
                    {checks.check2 ? <strong>CUMPLIDO</strong> :
                     checks.check1 && !checks.check2 ? <span>{tiempos.ct2}</span> : <span>*************</span>
                    }
                </div>

                {/* Cuenta 3 */}
                <div className="fila-cuenta">
                    {checks.check3 ? <strong>CUMPLIDO</strong> :
                     checks.check2 && !checks.check3 ? <span>{tiempos.ct3}</span> : <span>*************</span>
                    }
                </div>
            </div>
            {/* ------------------------------- */}

            {/* --- NUEVO: BOTONES DE SORPRESA FINAL --- */}
            {checks.check3 && (
                <div style={{marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center'}}>
                    <button onClick={abrirVideoEnlace} className="menu-btn primary" style={{fontSize: '1.2rem', padding: '15px 30px'}}>
                        Ir a la sorpresa
                    </button>
                    <button onClick={() => {
                        // Acción para reiniciar el contador manualmente
                        setChecks({ check1: false, check2: false, check3: false });
                        audioBucleRef.current.pause();
                        audioBucleRef.current.currentTime = 0;
                        setMostrarVideoFondo(false);
                    }} className="menu-btn tertiary" style={{padding: '10px'}}>
                        🔄
                    </button>
                </div>
            )}
            
            {/* CAMPO PARA CÓDIGOS DE ADMINISTRACIÓN (Sombras/Reiniciar) */}
            <div style={{marginTop: '40px', borderTop: '1px solid #444', paddingTop: '10px'}}>
                <input 
                type="text" 
                placeholder="Código" 
                className="input-codigo"
                style={{backgroundColor: '#222', color: '#fff'}}
                value={codigoInput}
                onChange={e => setCodigoInput(e.target.value)}
                />
                <button onClick={comprobarCodigo} className="boton-enviar" style={{backgroundColor: '#666'}}>
                Enviar
                </button>
            </div>

            <button onClick={() => {
              setCodigoCorrecto(false);
              setPaginaActual('menu');
            }} className="menu-btn tertiary" style={{marginTop: '30px'}}>
              Volver al Menú
            </button>
          </div>
        </div>
      )}
      {/* ------------------------------ */}

      {/* ... [Resto de vistas igual] ... */}
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
                      <button onClick={() => iniciarJuego(todasLasPreguntas)} className="menu-btn primary">Preguntas Aleatorias </button>
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
      )}
    </>
  );
}
export default App;