import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import '@fontsource-variable/manrope'
import { calculators, categories, categoryPath } from './calculators/catalog'
import { CalculatorPage } from './ui/calculator-page'
import { Directory, Favorites, History, Home, NotFound } from './ui/pages'
import { Shell } from './ui/shell'
import { WorkspaceProvider } from './ui/state'
import './styles.css'

function App() {
  return <BrowserRouter useTransitions={false}><WorkspaceProvider><Shell><Routes>
    <Route path="/" element={<Home/>}/>
    <Route path="/calculators" element={<Directory/>}/>
    {categories.map(category => <Route key={category.id} path={categoryPath(category.id)} element={<Directory fixedCategory={category.id}/>}/>)}
    {calculators.map(calculator => <Route key={calculator.id} path={calculator.path} element={<CalculatorPage key={calculator.id} calculator={calculator}/>}/>)}
    <Route path="/favorites" element={<Favorites/>}/>
    <Route path="/history" element={<History/>}/>
    <Route path="*" element={<NotFound/>}/>
  </Routes></Shell></WorkspaceProvider></BrowserRouter>
}

createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>)
