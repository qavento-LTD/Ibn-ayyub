async function loadComponents() {
  // اختار كل التاجات اللي ليها ملفات بنفس اسمها
  const components = ["header", "footer"]; // زوّد اللي انت عايزه

  for (let name of components) {
    const tag = document.querySelector(name);
    if (!tag) continue;

    const path = `../components/${name}.html`; 
    const res = await fetch(path);

    if (!res.ok) {
      console.error(`Failed to load ${path}`);
      continue;
    }

    tag.innerHTML = await res.text();
  }
}

loadComponents();