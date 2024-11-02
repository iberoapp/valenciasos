// ruta: src/app/page.js
"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import styled from "styled-components";
import Image from "next/image";

export default function Home() {
  const [recientes, setRecientes] = useState([]);
  const [populares, setPopulares] = useState([]);
  const [newHelp, setNewHelp] = useState({
    _id: null,
    nombre: "",
    descripcion: "",
    localidad: "",
    location: { type: "Point", coordinates: [] }, // Inicializamos location como Point con coordenadas vacías
  });
  const [duplicados, setDuplicados] = useState([]);
  const [clickedAssistance, setClickedAssistance] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState(null);
  const itemsPerPage = 10;
  const DISABLED_TIME = 240000;
  const [isDuplicate, setIsDuplicate] = useState(false);

  // Función de obtención de datos
  const fetchData = async () => {
    try {
      const recientesRes = await axios.get("/api/ayudas?type=recientes");
      const popularesRes = await axios.get("/api/ayudas?type=populares");
      setRecientes(recientesRes.data.data);
      setPopulares(popularesRes.data.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 20000);
    return () => clearInterval(intervalId);
  }, []);

  const handleAsistencia = async (id) => {
    if (clickedAssistance[id]) return;
    try {
      await axios.put("/api/ayudas", { id });
      setClickedAssistance((prev) => ({ ...prev, [id]: true }));
      fetchData();
      setTimeout(() => {
        setClickedAssistance((prev) => ({ ...prev, [id]: false }));
      }, DISABLED_TIME);
    } catch (error) {
      console.error("Error updating asistencia:", error);
    }
  };

  const handleInputChange = async (e) => {
    const { name, value } = e.target;
    setNewHelp((prev) => ({ ...prev, [name]: value }));

    if (name === "nombre" && value) {
      try {
        const response = await axios.get(`/api/ayudas/search?nombre=${value}`);
        setDuplicados(response.data.data);
        setIsDuplicate(response.data.data.length > 0);
      } catch (error) {
        console.error("Error fetching duplicates:", error);
      }
    }
  };

  const fetchUserLocation = async () => {
    try {
      const response = await axios.get("https://ipapi.co/json/");
      const { latitude, longitude } = response.data;
      setNewHelp((prev) => ({
        ...prev,
        location: {
          type: "Point",
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
      }));
    } catch (error) {
      console.error("Error fetching location:", error);
    }
  };

  useEffect(() => {
    if (isModalOpen) fetchUserLocation();
  }, [isModalOpen]);

  const handleAddNewHelp = async () => {
    try {
      const helpData = {
        ...newHelp,
        totalSolicitudes: 1,
      };
  
      await axios.post("/api/ayudas", helpData);
      setMessage("Solicitud enviada con éxito.");
      fetchData();
      setIsDuplicate(false);
  
      // Restablecer el estado de `newHelp` y cerrar el modal
      setTimeout(() => {
        setNewHelp({
          _id: null,
          nombre: "",
          descripcion: "",
          localidad: "",
          location: { type: "Point", coordinates: [] },
        });
        setIsModalOpen(false);
        setMessage(null);
      }, 1000);
    } catch (error) {
      console.error("Error submitting new help:", error);
      setMessage("Error al enviar la solicitud.");
    }
  };
  
  const handleSolicitudes = async (help) => {
    console.log("ID enviado para incrementar solicitud:", help._id);
    try {
      await axios.patch("/api/ayudas", { id: help._id });
      setMessage("Solicitud incrementada con éxito.");
      fetchData();
  
      // Restablecer el estado y cerrar el modal
      setTimeout(() => {
        setNewHelp({
          _id: null,
          nombre: "",
          descripcion: "",
          localidad: "",
          location: { type: "Point", coordinates: [] },
        });
        setIsDuplicate(false);
        setIsModalOpen(false);
        setMessage(null);
      }, 1000);
    } catch (error) {
      console.error("Error incrementando solicitudes:", error);
      setMessage("Error al incrementar la solicitud.");
    }
  };

  const handleSelectDuplicate = (duplicate) => {
    setNewHelp({
      _id: duplicate._id,
      nombre: duplicate.nombre,
      descripcion: duplicate.descripcion || "",
      localidad: duplicate.localidad || "",
      location: duplicate.location || { type: "Point", coordinates: [] },
    });
    setDuplicados([]);
    setIsDuplicate(true);
  };

  const handleOutsideClick = (e) => {
    if (e.target.id === "modalBackground") {
      setIsModalOpen(false);
    }
  };

  const paginatedItems = recientes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <Container>
      <StickySection>
        <SectionHeader>
          <Title>Solicitudes más recientes</Title>
          <PaginationControls>
            <PaginationButton
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            >
              Anterior
            </PaginationButton>
            <PaginationButton
              onClick={() => setCurrentPage((prev) => prev + 1)}
            >
              Siguiente
            </PaginationButton>
          </PaginationControls>
          <Button onClick={() => setIsModalOpen(true)}>Solicitar Ayuda</Button>
        </SectionHeader>
        <Grid>
          {paginatedItems.map((ayuda) => (
            <AyudaCard key={ayuda._id}>
              <HelpTitle>{ayuda.nombre}</HelpTitle>
              <HelpLocation>{ayuda.localidad}</HelpLocation>
              <p>{ayuda.descripcion}</p>
              <Stats>
                <span>Solicitudes: {ayuda.totalSolicitudes}</span>
                <span>Asistencias: {ayuda.totalAsistencias}</span>
              </Stats>
              <ActionButton
                onClick={() => handleAsistencia(ayuda._id)}
                active={!clickedAssistance[ayuda._id]}
              >
                <Image
                  src={
                    clickedAssistance[ayuda._id]
                      ? "/comenta-alt-check.svg"
                      : "/viaje-en-coche.svg"
                  }
                  alt="Icon"
                  width={24}
                  height={24}
                />
                <ButtonText>
                  {clickedAssistance[ayuda._id] ? "Recibido" : "Voy en camino"}
                </ButtonText>
              </ActionButton>
            </AyudaCard>
          ))}
        </Grid>
      </StickySection>

      <StickySection>
        <SectionHeader>
          <Title>Más solicitado</Title>
          <PaginationControls>
            <PaginationButton
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            >
              Anterior
            </PaginationButton>
            <PaginationButton
              onClick={() => setCurrentPage((prev) => prev + 1)}
            >
              Siguiente
            </PaginationButton>
          </PaginationControls>
        </SectionHeader>
        <Grid>
          {populares.map((ayuda) => (
            <AyudaCard key={ayuda._id}>
              <HelpTitle>{ayuda.nombre}</HelpTitle>
              <HelpLocation>{ayuda.localidad}</HelpLocation>
              <p>{ayuda.descripcion}</p>
              <Stats>
                <span>Solicitudes: {ayuda.totalSolicitudes}</span>
                <span>Asistencias: {ayuda.totalAsistencias}</span>
              </Stats>
              <ActionButton
                onClick={() => handleAsistencia(ayuda._id)}
                active={!clickedAssistance[ayuda._id]}
              >
                <Image
                  src={
                    clickedAssistance[ayuda._id]
                      ? "/comenta-alt-check.svg"
                      : "/viaje-en-coche.svg"
                  }
                  alt="Icon"
                  width={24}
                  height={24}
                />
                <ButtonText>
                  {clickedAssistance[ayuda._id] ? "Recibido" : "Voy en camino"}
                </ButtonText>
              </ActionButton>
            </AyudaCard>
          ))}
        </Grid>
      </StickySection>

      {isModalOpen && (
        <ModalBackground id="modalBackground" onClick={handleOutsideClick}>
          <ModalContent>
            <h3>Solicitar Ayuda</h3>
            <Input
              type="text"
              name="nombre"
              placeholder="Nombre de la ayuda"
              value={newHelp.nombre || ""}
              onChange={handleInputChange}
            />
            {duplicados.length > 0 && (
              <DuplicateList>
                {duplicados.map((dup) => (
                  <DuplicateItem
                    key={dup._id}
                    onClick={() => handleSelectDuplicate(dup)}
                  >
                    {dup.nombre} - {dup.localidad}
                  </DuplicateItem>
                ))}
              </DuplicateList>
            )}
            <Input
              type="text"
              name="descripcion"
              placeholder="Descripción"
              value={newHelp.descripcion || ""}
              onChange={handleInputChange}
            />
            <Input
              type="text"
              name="localidad"
              placeholder="Localidad"
              value={newHelp.localidad || ""}
              onChange={handleInputChange}
            />
            <p>Coordenadas: {newHelp.coordenadas || "Cargando ubicación..."}</p>
            <SubmitButton
              isDuplicate={isDuplicate}
              onClick={
                isDuplicate
                  ? () => handleSolicitudes(newHelp)
                  : handleAddNewHelp
              }
            >
              {isDuplicate ? "Solicitar Ayuda" : "Enviar"}
            </SubmitButton>
            {message && <Message>{message}</Message>}
          </ModalContent>
        </ModalBackground>
      )}
    </Container>
  );
}

const Container = styled.div`
  padding: 10px;
  font-family: "Nunito Sans", "Montserrat", sans-serif;
`;

const StickySection = styled.div`
  position: relative;
  margin-bottom: 30px;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  gap: 10px;
  background-color: #fff;
  padding: 10px 0;
  z-index: 1;
`;

const Title = styled.div`
  font-size: 18px;
  font-weight: bold;
`;

const PaginationControls = styled.div`
  display: flex;
  gap: 10px;
`;

const PaginationButton = styled.button`
  padding: 5px 10px;
`;

const Button = styled.button`
  padding: 5px 10px;
`;

const SubmitButton = styled.button`
  font-size: 1rem;
  padding: 12px;
  border: none;
  border-radius: 6px;
  width: 100%;
  margin: 8px 0;
  box-sizing: border-box;
  background-color: ${({ isDuplicate }) =>
    isDuplicate ? "#4caf50" : "#2196f3"};
  color: #fff;
  cursor: pointer;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: ${({ isDuplicate }) =>
      isDuplicate ? "#45a049" : "#1976d2"};
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 10px;
`;

const AyudaCard = styled.div`
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 8px;
  position: relative;
`;

const HelpTitle = styled.h3`
  font-size: 1.2rem;
  margin: 0;
  padding: 0;
`;

const HelpLocation = styled.p`
  font-size: 0.9rem;
  color: #666;
  margin: 4px 0;
`;

const Stats = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #555;
`;

const Message = styled.p`
  color: #28a745;
  margin-top: 10px;
  font-size: 14px;
`;

const ActionButton = styled.button`
  width: 100%;
  background-color: ${({ active }) => (active ? "#98dbe3" : "#f0f0f0")};
  border-radius: 8px;
  margin-top: 12px;
  padding: 8px;
  border: none;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: ${({ active }) => (active ? "pointer" : "not-allowed")};
  transition: background-color 0.3s ease;
`;

const ButtonText = styled.span`
  margin-left: 8px;
  font-size: 0.9rem;
  color: #333;
`;

const ModalBackground = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
`;

const ModalContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  width: 80%;
  max-width: 400px;
  text-align: center;
`;

const Input = styled.input`
  font-size: 1rem;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  width: 100%;
  margin: 8px 0;
  box-sizing: border-box;
`;

const DuplicateList = styled.div`
  margin-top: 10px;
  background: #f8f8f8;
  border-radius: 4px;
  padding: 10px;
`;

const DuplicateItem = styled.div`
  padding: 5px;
  cursor: pointer;
  &:hover {
    background-color: #e0e0e0;
  }
`;
