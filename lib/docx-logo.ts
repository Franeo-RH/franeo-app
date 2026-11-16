// lib/docx-logo.ts
// Ajoute le logo de l'entreprise en haut du document Word généré (en-tête de la première section).
// Fonctionne avec les modèles FRANEO RH comme avec ceux importés par le client : si le modèle a déjà un
// en-tête, le logo est ajouté au début ; sinon un en-tête est créé.

/** Ce qu'il faut de l'objet PizZip (zip.file(nom) / zip.file(nom, contenu)) */
export type ZipLike = {
  file(nom: string): { asText(): string } | null;
  file(nom: string, contenu: string | Uint8Array | ArrayBuffer): unknown;
};

export type Logo = { octets: Uint8Array; type: "png" | "jpeg"; largeur: number; hauteur: number };

const EMU_CM = 360000;
const HAUTEUR_MAX = 1.7 * EMU_CM; // 1,7 cm
const LARGEUR_MAX = 6 * EMU_CM; // 6 cm
const NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const NS_WP = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
const NS_W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const TYPE_IMAGE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";
const TYPE_HEADER = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/header";

function lire(zip: ZipLike, nom: string) { return zip.file(nom)?.asText() ?? null; }

function ajouterRelation(xml: string, id: string, type: string, cible: string) {
  if (xml.includes(`Id="${id}"`)) return xml;
  return xml.replace("</Relationships>", `<Relationship Id="${id}" Type="${type}" Target="${cible}"/></Relationships>`);
}

/** Dimensions affichées : 1,7 cm de haut au plus, 6 cm de large au plus, proportions conservées */
function dimensions(l: Logo) {
  const ratio = l.largeur > 0 && l.hauteur > 0 ? l.largeur / l.hauteur : 3;
  let cy = HAUTEUR_MAX, cx = cy * ratio;
  if (cx > LARGEUR_MAX) { cx = LARGEUR_MAX; cy = cx / ratio; }
  return { cx: Math.round(cx), cy: Math.round(cy) };
}

function paragrapheLogo(rId: string, l: Logo) {
  const { cx, cy } = dimensions(l);
  return `<w:p><w:pPr><w:spacing w:after="120"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="9171" name="LogoEntreprise"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="9171" name="logo-entreprise"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
}

/** Déclare les espaces de noms nécessaires sur la balise racine d'un en-tête existant */
function avecEspacesDeNoms(xml: string) {
  return xml.replace(/<w:hdr\b([^>]*)>/, (tout, attrs: string) => {
    let a = attrs;
    if (!/\sxmlns:r=/.test(a)) a += ` xmlns:r="${NS_R}"`;
    if (!/\sxmlns:wp=/.test(a)) a += ` xmlns:wp="${NS_WP}"`;
    return `<w:hdr${a}>`;
  });
}

export function ajouterLogo(zip: ZipLike, logo: Logo): boolean {
  const doc = lire(zip, "word/document.xml");
  const relsDoc = lire(zip, "word/_rels/document.xml.rels");
  const types = lire(zip, "[Content_Types].xml");
  if (!doc || !relsDoc || !types) return false;

  const ext = logo.type === "png" ? "png" : "jpeg";
  const media = `media/logo-entreprise.${ext}`;
  zip.file(`word/${media}`, logo.octets);
  if (!new RegExp(`Extension="${ext}"`, "i").test(types)) {
    zip.file("[Content_Types].xml", types.replace(/(<Types[^>]*>)/, `$1<Default Extension="${ext}" ContentType="image/${ext}"/>`));
  }

  // En-tête par défaut de la première section, s'il existe
  const premiereSection = doc.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/);
  const refExistante = premiereSection?.[0].match(/<w:headerReference\b[^>]*w:type="default"[^>]*\/>/) ?? doc.match(/<w:headerReference\b[^>]*w:type="default"[^>]*\/>/);
  const rIdExistant = refExistante?.[0].match(/r:id="([^"]+)"/)?.[1];
  const cibleExistante = rIdExistant ? relsDoc.match(new RegExp(`<Relationship[^>]*Id="${rIdExistant}"[^>]*Target="([^"]+)"`))?.[1] ?? relsDoc.match(new RegExp(`<Relationship[^>]*Target="([^"]+)"[^>]*Id="${rIdExistant}"`))?.[1] : undefined;

  if (cibleExistante) {
    const chemin = `word/${cibleExistante.replace(/^\/?word\//, "")}`;
    const nomFichier = chemin.split("/").pop()!;
    const cheminRels = `word/_rels/${nomFichier}.rels`;
    const hdr = lire(zip, chemin);
    if (!hdr) return false;
    const rels = lire(zip, cheminRels) ?? `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;
    zip.file(cheminRels, ajouterRelation(rels, "rIdLogoEntreprise", TYPE_IMAGE, media));
    zip.file(chemin, avecEspacesDeNoms(hdr).replace(/(<w:hdr\b[^>]*>)/, `$1${paragrapheLogo("rIdLogoEntreprise", logo)}`));
    return true;
  }

  // Pas d'en-tête : on en crée un et on le rattache à chaque section
  const entete = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr xmlns:w="${NS_W}" xmlns:r="${NS_R}" xmlns:wp="${NS_WP}">${paragrapheLogo("rIdLogoEntreprise", logo)}</w:hdr>`;
  zip.file("word/headerLogoEntreprise.xml", entete);
  zip.file("word/_rels/headerLogoEntreprise.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdLogoEntreprise" Type="${TYPE_IMAGE}" Target="${media}"/></Relationships>`);
  zip.file("word/_rels/document.xml.rels", ajouterRelation(relsDoc, "rIdEnteteLogo", TYPE_HEADER, "headerLogoEntreprise.xml"));
  const typesMaj = lire(zip, "[Content_Types].xml")!;
  if (!typesMaj.includes("/word/headerLogoEntreprise.xml")) {
    zip.file("[Content_Types].xml", typesMaj.replace("</Types>", `<Override PartName="/word/headerLogoEntreprise.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/></Types>`));
  }
  const docAvecNs = /<w:document\b[^>]*\sxmlns:r=/.test(doc) ? doc : doc.replace(/<w:document\b/, `<w:document xmlns:r="${NS_R}"`);
  // headerReference doit être le premier enfant de w:sectPr
  const ref = `<w:headerReference w:type="default" r:id="rIdEnteteLogo"/>`;
  zip.file("word/document.xml", docAvecNs.replace(/<w:sectPr\b([^>]*?)(\/?)>/g, (_m, attrs: string, ferme: string) => (ferme ? `<w:sectPr${attrs}>${ref}</w:sectPr>` : `<w:sectPr${attrs}>${ref}`)));
  return true;
}
