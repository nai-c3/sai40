# Simon wird 40 🚲

Einladungs-Website (Onepager) für Simons 40. Geburtstag – Fahrradtour inkl. 2 Übernachtungen.

Reines HTML/CSS/JS, kein Build nötig: `index.html` im Browser öffnen oder z. B. über GitHub Pages hosten.

## Inhalte anpassen
- **Texte:** alles in `[eckigen Klammern]` bzw. mit `XX` in `index.html` ersetzen.
- **Bilder:** Platzhalter in `assets/img/` (`simon`, `hero`, `route`, `unterkunft-1…3`). Eigene Fotos ablegen und die `src`-Pfade in `index.html` anpassen. Für das Hero-Bild am besten ein freigestelltes PNG.
- **3D-Objekte:** jedes `<div class="obj3d" data-obj="…" data-speed="…">` erzeugt ein 3D-Objekt.
  - `data-obj`: `bike`, `helmet`, `lotto` (Rubbellos), `guitar`, `bottle` (Simon-Wasserflasche), `disco`, `balloon`, `balloons` (Ballon-Strauß) (unbekannt = zufällig)
  - `data-speed`: Parallax-Stärke (negativ = Gegenrichtung)
  - Zusätzlich werden kleine zufällige Objekte über die Seite verteilt (`assets/js/main.js`, `floaterCount`).
- **Farben/Schriften:** CSS-Variablen oben in `assets/css/style.css`.
