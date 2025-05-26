// // src/theme.js
// import { createTheme } from '@mui/material/styles';

// const theme = createTheme({
//   palette: {
//     primary: {
//       main: '#673ab7', // Deep Purple
//     },
//     secondary: {
//       main: '#ff4081', // Pink A200
//     },
//     background: {
//       default: '#FFF3E0',
//       paper: '#ffffff',
//     },
//   },
//   typography: {
//     fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
//     h5: {
//       fontWeight: 500,
//     },
//   },
//   shape: {
//     borderRadius: 8,
//   },
//   components: {
//     MuiButton: {
//       styleOverrides: {
//         root: {
//           textTransform: 'none',
//           padding: '8px 16px',
//         },
//       },
//     },
//     MuiCard: {
//       styleOverrides: {
//         root: {
//           boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
//         },
//       },
//     },
//     MuiTextField: {
//       defaultProps: {
//         variant: 'outlined',
//         margin: 'normal',
//       },
//     },
//     MuiAppBar: {
//         styleOverrides: {
//             root: {
//                 boxShadow: 'none',
//                 borderBottom: '1px solid #e0e0e0'
//             }
//         }
//     }
//   },
// });

// export default theme;
// src/theme.js
import { createTheme } from "@mui/material/styles"

const theme = createTheme({
  palette: {
    primary: {
      main: "#FF6B35", // Orange culinaire chaleureux
      light: "#FF8A65",
      dark: "#E64A19",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#4CAF50", // Vert herbes fraîches
      light: "#81C784",
      dark: "#388E3C",
      contrastText: "#ffffff",
    },
    tertiary: {
      main: "#FFC107", // Jaune épices
      light: "#FFD54F",
      dark: "#F57C00",
    },
    background: {
      default: "#FFF3E0", // Beige crème
      paper: "#FFFFFF",
      accent: "#FFF8E1", // Crème plus claire
    },
    text: {
      primary: "#3E2723", // Brun chocolat
      secondary: "#5D4037",
    },
    error: {
      main: "#D32F2F",
      light: "#EF5350",
      dark: "#C62828",
    },
    warning: {
      main: "#FF9800",
      light: "#FFB74D",
      dark: "#F57C00",
    },
    info: {
      main: "#2196F3",
      light: "#64B5F6",
      dark: "#1976D2",
    },
    success: {
      main: "#4CAF50",
      light: "#81C784",
      dark: "#388E3C",
    },
  },
  typography: {
    fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: "2.5rem",
      letterSpacing: "-0.02em",
    },
    h2: {
      fontWeight: 600,
      fontSize: "2rem",
      letterSpacing: "-0.01em",
    },
    h3: {
      fontWeight: 600,
      fontSize: "1.75rem",
    },
    h4: {
      fontWeight: 600,
      fontSize: "1.5rem",
    },
    h5: {
      fontWeight: 600,
      fontSize: "1.25rem",
    },
    h6: {
      fontWeight: 600,
      fontSize: "1.1rem",
    },
    body1: {
      fontSize: "1rem",
      lineHeight: 1.6,
    },
    body2: {
      fontSize: "0.875rem",
      lineHeight: 1.5,
    },
    button: {
      fontWeight: 600,
      textTransform: "none",
      letterSpacing: "0.02em",
    },
  },
  shape: {
    borderRadius: 5,
  },
  shadows: [
    "none",
    "0px 2px 8px rgba(255, 107, 53, 0.08)",
    "0px 4px 16px rgba(255, 107, 53, 0.12)",
    "0px 6px 24px rgba(255, 107, 53, 0.16)",
    "0px 8px 32px rgba(255, 107, 53, 0.20)",
    "0px 12px 40px rgba(255, 107, 53, 0.24)",
    "0px 16px 48px rgba(255, 107, 53, 0.28)",
    "0px 20px 56px rgba(255, 107, 53, 0.32)",
    "0px 24px 64px rgba(255, 107, 53, 0.36)",
    "0px 28px 72px rgba(255, 107, 53, 0.40)",
    "0px 32px 80px rgba(255, 107, 53, 0.44)",
    "0px 36px 88px rgba(255, 107, 53, 0.48)",
    "0px 40px 96px rgba(255, 107, 53, 0.52)",
    "0px 44px 104px rgba(255, 107, 53, 0.56)",
    "0px 48px 112px rgba(255, 107, 53, 0.60)",
    "0px 52px 120px rgba(255, 107, 53, 0.64)",
    "0px 56px 128px rgba(255, 107, 53, 0.68)",
    "0px 60px 136px rgba(255, 107, 53, 0.72)",
    "0px 64px 144px rgba(255, 107, 53, 0.76)",
    "0px 68px 152px rgba(255, 107, 53, 0.80)",
    "0px 72px 160px rgba(255, 107, 53, 0.84)",
    "0px 76px 168px rgba(255, 107, 53, 0.88)",
    "0px 80px 176px rgba(255, 107, 53, 0.92)",
    "0px 84px 184px rgba(255, 107, 53, 0.96)",
    "0px 88px 192px rgba(255, 107, 53, 1.00)",
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 5,
          padding: "10px 24px",
          fontWeight: 600,
          fontSize: "0.95rem",
          boxShadow: "none",
          "&:hover": {
            boxShadow: "0px 4px 16px rgba(255, 107, 53, 0.25)",
            transform: "translateY(-1px)",
          },
          transition: "all 0.2s ease-in-out",
        },
        contained: {
          background: "linear-gradient(135deg, #FF6B35 0%, #FF8A65 100%)",
          "&:hover": {
            background: "linear-gradient(135deg, #E64A19 0%, #FF6B35 100%)",
          },
        },
        outlined: {
          borderWidth: "2px",
          "&:hover": {
            borderWidth: "2px",
            backgroundColor: "rgba(255, 107, 53, 0.04)",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          boxShadow: "0px 8px 32px rgba(255, 107, 53, 0.08)",
          border: "1px solid rgba(255, 107, 53, 0.08)",
          background: "linear-gradient(135deg, #FFFFFF 0%, #FFF8E1 100%)",
          "&:hover": {
            boxShadow: "0px 16px 48px rgba(255, 107, 53, 0.15)",
            transform: "translateY(-2px)",
          },
          transition: "all 0.3s ease-in-out",
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
        margin: "normal",
      },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 12,
            backgroundColor: "#FFFFFF",
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#FF8A65",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#FF6B35",
              borderWidth: "2px",
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          borderBottom: "1px solid rgba(255, 107, 53, 0.1)",
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 248, 225, 0.95) 100%)",
          backdropFilter: "blur(20px)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontWeight: 500,
        },
        filled: {
          background: "linear-gradient(135deg, #FF6B35 0%, #FF8A65 100%)",
          color: "#FFFFFF",
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          background: "linear-gradient(135deg, #FF6B35 0%, #FF8A65 100%)",
          boxShadow: "0px 8px 32px rgba(255, 107, 53, 0.3)",
          "&:hover": {
            background: "linear-gradient(135deg, #E64A19 0%, #FF6B35 100%)",
            boxShadow: "0px 12px 40px rgba(255, 107, 53, 0.4)",
            transform: "scale(1.05)",
          },
          transition: "all 0.3s ease-in-out",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          background: "linear-gradient(135deg, #FFFFFF 0%, #FFF8E1 100%)",
        },
      },
    },
  },
})

export default theme
