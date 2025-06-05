import Papa from "papaparse";

// Export recipes to CSV with UTF-8 BOM
export const exportRecipesToCSV = (recipes, filename) => {
  const csvData = recipes.map((recipe) => ({
    name: recipe.name || "",
    description: recipe.description || "",
    prepTime: recipe.prepTime || "",
    servings: recipe.servings || "",
    ingredients: recipe.ingredients ? JSON.stringify(recipe.ingredients) : "",
    instructions: recipe.instructions ? JSON.stringify(recipe.instructions) : "",
    tags: recipe.tags ? recipe.tags.join(";") : "",
    visibility: recipe.visibility || "family",
    photoUrl: recipe.photoUrl || "",
  }));

  const csv = Papa.unparse(csvData, {
    quotes: true, // Ensure fields are quoted to handle special characters
    delimiter: ",",
    header: true,
  });

  // Add UTF-8 BOM to ensure proper encoding
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

// Parse CSV file to recipes
export const parseRecipesFromCSV = (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: (result) => {
        const recipes = [];
        const errors = [];

        result.data.forEach((row, index) => {
          try {
            // Validate required fields
            if (!row.name) {
              throw new Error(`Le champ 'name' est requis pour la recette à la ligne ${index + 2}.`);
            }

            // Parse ingredients
            let ingredients = [];
            try {
              ingredients = row.ingredients ? JSON.parse(row.ingredients) : [];
              if (!Array.isArray(ingredients)) {
                throw new Error("Les ingrédients doivent être un tableau JSON valide.");
              }
            } catch (err) {
              throw new Error(`Erreur dans les ingrédients à la ligne ${index + 2} : ${err.message}`);
            }

            // Parse instructions
            let instructions = "";
            try {
              if (row.instructions) {
                const parsed = JSON.parse(row.instructions);
                // Si c'est une chaîne, on la garde telle quelle ; sinon, on peut gérer les tableaux si nécessaire
                instructions = typeof parsed === "string" ? parsed : (Array.isArray(parsed) ? parsed : "");
              }
            } catch (err) {
              errors.push(`Erreur dans les instructions à la ligne ${index + 2} (recette "${row.name}") : ${err.message}`);
              return; // Skip this recipe
            }

            let tags = [];
            if (row.tags) {
              tags = row.tags.split(";").map((tag) => tag.trim()).filter((tag) => tag);
            }

            recipes.push({
              name: row.name,
              description: row.description || "",
              prepTime: row.prepTime ? parseInt(row.prepTime, 10) : null,
              servings: row.servings ? parseInt(row.servings, 10) : null,
              ingredients,
              instructions,
              tags,
              visibility: row.visibility === "public" ? "public" : "family",
              photoUrl: row.photoUrl || "",
              nutritionalInfo: {
                calories: row.calories && !isNaN(parseInt(row.calories, 10)) ? parseInt(row.calories, 10) : null,
                protein: row.protein && !isNaN(parseInt(row.protein, 10)) ? parseInt(row.protein, 10) : null,
                carbs: row.carbs && !isNaN(parseInt(row.carbs, 10)) ? parseInt(row.carbs, 10) : null,
                fat: row.fat && !isNaN(parseInt(row.fat, 10)) ? parseInt(row.fat, 10) : null,
                fiber: row.fiber && !isNaN(parseInt(row.fiber, 10)) ? parseInt(row.fiber, 10) : null,
                sugar: row.sugar && !isNaN(parseInt(row.sugar, 10)) ? parseInt(row.sugar, 10) : null,
                sodium: row.sodium && !isNaN(parseInt(row.sodium, 10)) ? parseInt(row.sodium, 10) : null,
                allergenInfo: row.allergenInfo || null,
              },
            });
          } catch (err) {
            errors.push(`Erreur à la ligne ${index + 2} (recette "${row.name || "inconnue"}") : ${err.message}`);
          }
        });

        if (recipes.length === 0 && errors.length > 0) {
          reject(new Error(`Aucune recette valide importée. Erreurs : ${errors.join("; ")}`));
        } else if (errors.length > 0) {
          console.warn(`Certaines recettes n'ont pas été importées : ${errors.join("; ")}`);
          resolve(recipes); // Proceed with valid recipes
        } else {
          resolve(recipes);
        }
      },
      error: (err) => {
        reject(new Error(`Erreur lors de l'analyse du CSV : ${err.message}`));
      },
    });
  });
};
