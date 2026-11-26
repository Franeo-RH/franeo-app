// Pont avec le portail admin FRANEO quand l'app est affichée dans son cadre :
// - thème jour / nuit identique au portail (message « franeo-theme », retenu pour les pages suivantes) ;
// - navigation demandée par le menu du portail sans nouvelle connexion (« franeo-aller ») ;
// - la page affichée est signalée au portail (« franeo-page ») pour surligner le bon menu.
// Seuls les messages venant de l'adresse du portail (HUB_PORTAIL_URL) sont acceptés.

export function scriptPontPortail(classeNuit: string) {
  const portail = (process.env.HUB_PORTAIL_URL || "https://admin.franeo-rh.com").replace(/\/$/, "");
  return `(function(){var h=document.documentElement;if(!h.classList.contains("fr-integre"))return;var O=${JSON.stringify(portail)};
function theme(t){if(t==="nuit")h.classList.add(${JSON.stringify(classeNuit)});else h.classList.remove(${JSON.stringify(classeNuit)});}
try{theme(sessionStorage.getItem("fr-portail-theme"))}catch(e){}
function signaler(){try{parent.postMessage({type:"franeo-page",path:location.pathname+location.search},O)}catch(e){}}
var p=history.pushState,r=history.replaceState;history.pushState=function(){var x=p.apply(this,arguments);signaler();return x};history.replaceState=function(){var x=r.apply(this,arguments);signaler();return x};
addEventListener("popstate",signaler);addEventListener("DOMContentLoaded",signaler);
addEventListener("message",function(e){if(e.origin!==O)return;var d=e.data||{};
if(d.type==="franeo-theme"){try{sessionStorage.setItem("fr-portail-theme",d.theme)}catch(x){}theme(d.theme)}
if(d.type==="franeo-aller"&&typeof d.page==="string"&&/^\\/(?!\\/)/.test(d.page)){if(location.pathname+location.search!==d.page)location.assign(d.page)}
if(d.type==="franeo-recharger")location.reload();});})();`;
}
