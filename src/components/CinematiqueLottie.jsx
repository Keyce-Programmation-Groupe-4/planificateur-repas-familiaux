import React, { useEffect, useRef } from "react";
import lottie from "lottie-web";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

export default function CinematiqueLottie({ onEnd, duration = 3500 }) {
  const containerRef = useRef(null);

  useEffect(() => {
    let anim;
    let timeoutId;

    fetch("/EasyMealCinematique.json")
      .then((res) => res.json())
      .then((animationData) => {
        anim = lottie.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          loop: false,
          autoplay: true,
          animationData,
        });
      });

    // Fin automatique après la durée spécifiée
    timeoutId = setTimeout(() => {
      if (onEnd) onEnd();
    }, duration);

    return () => {
      if (anim) anim.destroy();
      clearTimeout(timeoutId);
    };
  }, [onEnd, duration]);

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        bgcolor: "background.default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 2000,
      }}
    >
      <Box
        ref={containerRef}
        sx={{
          width: { xs: 260, sm: 340, md: 400 },
          height: { xs: 260, sm: 340, md: 400 },
        }}
      />
      {/* Fallback loader */}
      <CircularProgress
        size={48}
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          mt: "-24px",
          ml: "-24px",
          color: "primary.main",
          opacity: 0.2,
        }}
      />
    </Box>
  );
}