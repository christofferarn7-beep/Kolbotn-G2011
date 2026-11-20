# Kolbotn G2011 – lagets nettside

Nettside for TG1 i Kolbotn G2011: kalender, spillmodell, utviklingsplan, samtykke fra foresatte, månedlig høydemåling og trenerside.

- Ren HTML, CSS og JavaScript uten byggesteg eller eksterne biblioteker.
- Innlogging og data ligger i Supabase (EU). Tilgang styres med regler i databasen, ikke i denne koden.
- Nøkkelen i `app.js` er Supabase sin offentlige nøkkel og er laget for å ligge i nettsiden.
- Kontoer lages med engangskoder fra treneren. Ingen e-post sendes.

Innhold som kalender, perioder og spillmodell endres i databasen, ikke her. Trenerne legger inn, endrer og avlyser økter selv på siden (Kalender → Ny økt for laget).

`index.html` laster `app.js?v=…` og `style.css?v=…`. Bytt `v` (f.eks. de første tegnene i en sha256 av de to filene) hver gang en av dem endres. Da får alle den nye versjonen med en gang, og siden viser «Siden er oppdatert» til dem som har den åpen.
