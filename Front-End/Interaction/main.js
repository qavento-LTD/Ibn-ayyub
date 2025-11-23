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

  // شغّل كود المينيو بعد التحميل
  initMenu();
}

loadComponents();


// =================================================
// كود المينيو – لازم يكون داخل فانكشن منفصل
// =================================================
function initMenu() {
  const menuBtn = document.getElementById('menuBtn');
  const nav = document.querySelector('.nav'); // انت كاتب navMenu وهي navLink في الهيدر

  if (!menuBtn || !nav) {
    console.error("Menu elements not found yet.");
    return;
  }

  function toggleMenu(){
    const active = menuBtn.classList.toggle('active');
    active ? nav.classList.add('open') : nav.classList.remove('open');
  }

  menuBtn.addEventListener('click', toggleMenu);

  menuBtn.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      toggleMenu();
    }
  });
}