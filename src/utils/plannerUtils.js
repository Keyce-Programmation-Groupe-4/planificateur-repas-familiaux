// src/utils/plannerUtils.js
import { eachDayOfInterval } from "date-fns"

export const generateRandomPlan = (recipes, startDate, endDate, categories) => {
  const days = eachDayOfInterval({ start: startDate, end: endDate })
  const plan = []

  days.forEach((day) => {
    categories.forEach((category) => {
      const categoryRecipes = recipes.filter((recipe) => recipe.category === category)
      if (categoryRecipes.length > 0) {
        const randomRecipe = categoryRecipes[Math.floor(Math.random() * categoryRecipes.length)]
        plan.push({
          date: day,
          category,
          recipeId: randomRecipe.id,
          recipeName: randomRecipe.name || "Recette sans nom",
        })
      }
    })
  })

  return plan
}