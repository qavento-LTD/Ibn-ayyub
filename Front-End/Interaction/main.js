async function loadComponents() {
  const components = ["header", "footer"];
  
  for (let name of components) {
    const tag = document.querySelector(name);
    if (!tag) continue;
    
    const path = `/components/${name}.html`;
    const res = await fetch(path);
    
    if (!res.ok) {
      console.error(`Failed to load ${path}`);
      continue;
    }
    
    tag.innerHTML = await res.text();
  }
}

// شغّل الكومبوننت وبعدين نفّذ الكود اللي بعده
loadComponents()
