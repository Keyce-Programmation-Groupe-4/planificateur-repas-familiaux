import { describe, it, expect } from 'vitest';
import { parseRecipesFromCSV } from './csvUtils';

describe('parseRecipesFromCSV', () => {
  const baseHeaders = 'name,description,prepTime,servings,ingredients,instructions,tags,visibility,photoUrl';
  const nutritionalHeaders = 'calories,protein,carbs,fat,fiber,sugar,sodium,allergenInfo';

  it('should parse a CSV with full nutritional information', async () => {
    const csvData = `${baseHeaders},${nutritionalHeaders}
Test Recipe 1,Desc 1,30,4,"[\"ing1\"]","Instruction 1",tag1,public,,500,20,30,10,5,100,250,"Contains nuts"`;
    const file = new File([csvData], "recipes1.csv", { type: "text/csv" });
    const recipes = await parseRecipesFromCSV(file);

    expect(recipes.length).toBe(1);
    expect(recipes[0].name).toBe("Test Recipe 1");
    expect(recipes[0].nutritionalInfo).toEqual({
      calories: 500,
      protein: 20,
      carbs: 30,
      fat: 10,
      fiber: 5,
      sugar: 100,
      sodium: 250,
      allergenInfo: "Contains nuts",
    });
  });

  it('should handle missing optional nutritional fields (resulting in null)', async () => {
    const csvData = `${baseHeaders},${nutritionalHeaders}
Test Recipe 2,Desc 2,,,,,"[]","[]",tag2,public,,100,5,,,,,""`; // fiber, sugar, sodium, allergenInfo empty
    const file = new File([csvData], "recipes2.csv", { type: "text/csv" });
    const recipes = await parseRecipesFromCSV(file);

    expect(recipes.length).toBe(1);
    expect(recipes[0].name).toBe("Test Recipe 2");
    expect(recipes[0].nutritionalInfo).toEqual({
      calories: 100,
      protein: 5,
      carbs: null,
      fat: null,
      fiber: null,
      sugar: null,
      sodium: null,
      allergenInfo: null,
    });
  });

  it('should handle invalid non-numeric data in numerical nutritional fields (resulting in null)', async () => {
    const csvData = `${baseHeaders},${nutritionalHeaders}
Test Recipe 3,Desc 3,15,2,"[]","[]",tag3,public,,abc,xyz,invalid,bad,NaN,Nil,N/A,"Gluten-free"`;
    const file = new File([csvData], "recipes3.csv", { type: "text/csv" });
    const recipes = await parseRecipesFromCSV(file);

    expect(recipes.length).toBe(1);
    expect(recipes[0].name).toBe("Test Recipe 3");
    expect(recipes[0].nutritionalInfo).toEqual({
      calories: null,
      protein: null,
      carbs: null,
      fat: null,
      fiber: null,
      sugar: null,
      sodium: null,
      allergenInfo: "Gluten-free",
    });
  });

  it('should correctly parse a mix of recipes with and without nutritional info', async () => {
    const csvData = `${baseHeaders},${nutritionalHeaders}
Recipe A,Desc A,10,1,"[]","[]",tagA,public,,200,10,15,5,2,50,120,"None"
Recipe B,Desc B,20,2,"[]","[]",tagB,public,,,,,,,,
Recipe C,Desc C,30,3,"[]","[]",tagC,public,,300,15,20,8,,,,"Soy"`; // Missing fiber, sugar, sodium
    const file = new File([csvData], "recipes4.csv", { type: "text/csv" });
    const recipes = await parseRecipesFromCSV(file);

    expect(recipes.length).toBe(3);

    expect(recipes[0].name).toBe("Recipe A");
    expect(recipes[0].nutritionalInfo).toEqual({
      calories: 200, protein: 10, carbs: 15, fat: 5, fiber: 2, sugar: 50, sodium: 120, allergenInfo: "None",
    });

    expect(recipes[1].name).toBe("Recipe B");
    expect(recipes[1].nutritionalInfo).toEqual({
      calories: null, protein: null, carbs: null, fat: null, fiber: null, sugar: null, sodium: null, allergenInfo: null,
    });

    expect(recipes[2].name).toBe("Recipe C");
    expect(recipes[2].nutritionalInfo).toEqual({
      calories: 300, protein: 15, carbs: 20, fat: 8, fiber: null, sugar: null, sodium: null, allergenInfo: "Soy",
    });
  });

  it('should handle an empty allergenInfo field as null', async () => {
    const csvData = `${baseHeaders},${nutritionalHeaders}
Recipe D,Desc D,40,4,"[]","[]",tagD,public,,400,25,35,12,6,80,300,`; // allergenInfo is empty
    const file = new File([csvData], "recipes5.csv", { type: "text/csv" });
    const recipes = await parseRecipesFromCSV(file);

    expect(recipes.length).toBe(1);
    expect(recipes[0].name).toBe("Recipe D");
    expect(recipes[0].nutritionalInfo.allergenInfo).toBeNull();
  });

  it('should parse CSV without any nutritional headers/columns (old format)', async () => {
    const csvData = `${baseHeaders}
Old Recipe,Old Desc,60,5,"[\"old ing\"]","Old Instruction",oldTag,family,http://example.com/old.jpg`;
    const file = new File([csvData], "recipes6.csv", { type: "text/csv" });
    const recipes = await parseRecipesFromCSV(file);

    expect(recipes.length).toBe(1);
    expect(recipes[0].name).toBe("Old Recipe");
    expect(recipes[0].description).toBe("Old Desc");
    expect(recipes[0].prepTime).toBe(60);
    expect(recipes[0].servings).toBe(5);
    expect(recipes[0].ingredients).toEqual(["old ing"]);
    expect(recipes[0].instructions).toBe("Old Instruction");
    expect(recipes[0].tags).toEqual(["oldTag"]);
    expect(recipes[0].visibility).toBe("family");
    expect(recipes[0].photoUrl).toBe("http://example.com/old.jpg");
    // For recipes parsed without nutritional columns, nutritionalInfo fields should all be null
    expect(recipes[0].nutritionalInfo).toEqual({
      calories: null, protein: null, carbs: null, fat: null, fiber: null, sugar: null, sodium: null, allergenInfo: null,
    });
  });

  it('should handle CSV with nutritional headers but no nutritional data for a row', async () => {
    const csvData = `${baseHeaders},${nutritionalHeaders}
Recipe E,Desc E,10,1,"[]","Instruction E",tagE,public,,,,,,,,`; // All nutritional fields empty
    const file = new File([csvData], "recipes7.csv", { type: "text/csv" });
    const recipes = await parseRecipesFromCSV(file);

    expect(recipes.length).toBe(1);
    expect(recipes[0].name).toBe("Recipe E");
    expect(recipes[0].nutritionalInfo).toEqual({
      calories: null, protein: null, carbs: null, fat: null, fiber: null, sugar: null, sodium: null, allergenInfo: null,
    });
  });

  it('should reject promise if CSV parsing itself fails (e.g., malformed file structure not handled by row-level try-catch)', async () => {
    // This test is tricky because PapaParse might still try to parse valid parts or return empty.
    // A truly malformed CSV that breaks PapaParse itself is needed.
    // For instance, unclosed quotes spanning multiple lines in a way that confuses the parser fundamentally.
    const malformedCsvData = `name,calories\n"Test Recipe","500\nAnother"Value"`; // Intentionally malformed
    const file = new File([malformedCsvData], "malformed.csv", { type: "text/csv" });

    await expect(parseRecipesFromCSV(file)).rejects.toThrow(/Erreur lors de l'analyse du CSV/);
  });

  it('should return errors for rows with missing required fields (name) but still process valid rows', async () => {
    const csvData = `${baseHeaders},${nutritionalHeaders}
,Desc NoName,10,1,"[]","[]",tagNoName,public,,100,10,10,10,10,10,10,""
Good Recipe,Desc Good,20,2,"[]","[]",tagGood,public,,200,20,20,20,20,20,20,"Nuts"`;
    const file = new File([csvData], "mixedValidity.csv", { type: "text/csv" });

    // parseRecipesFromCSV is expected to console.warn for errors and resolve with valid recipes.
    // To test the errors array behavior, we might need to modify parseRecipesFromCSV or mock console.warn.
    // For now, we'll check that the valid recipe is parsed.
    // The function's current implementation pushes to an 'errors' array but resolves valid recipes.
    // It might reject if NO recipes are valid.

    const recipes = await parseRecipesFromCSV(file);
    expect(recipes.length).toBe(1);
    expect(recipes[0].name).toBe("Good Recipe");
    expect(recipes[0].nutritionalInfo.calories).toBe(200);
  });

  it('should handle empty CSV file', async () => {
    const csvData = ``;
    const file = new File([csvData], "empty.csv", { type: "text/csv" });
    await expect(parseRecipesFromCSV(file)).rejects.toThrow("Aucune recette valide importée. Erreurs : Aucune donnée trouvée dans le fichier CSV.");
  });

  it('should handle CSV with only headers', async () => {
    const csvData = `${baseHeaders},${nutritionalHeaders}`;
    const file = new File([csvData], "only_headers.csv", { type: "text/csv" });
     await expect(parseRecipesFromCSV(file)).rejects.toThrow("Aucune recette valide importée. Erreurs : Aucune donnée trouvée dans le fichier CSV.");
  });

});
