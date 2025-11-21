async function load_component(){
	let component = ['header', 'footer'];
	for(let name of component){
		const tag = document.querySelector(name);
		console.log(name)
		if(tag){
			const path = `../components/${name}.html`;
			
			const res = await fetch(path);
			tag.innerHTML = await res.text();
		}
	}
}

load_component();