# Kolbotn G2011 – lagets nettside

Nettside for TG1 i Kolbotn G2011: kalender, spillmodell, utviklingsplan, samtykke fra foresatte, månedlig høydemåling og trenerside.

- Ren HTML, CSS og JavaScript uten byggesteg eller eksterne biblioteker.
- Innlogging og data ligger i Supabase (EU). Tilgang styres med regler i databasen, ikke i denne koden.
- Nøkkelen i `app.js` er Supabase sin offentlige nøkkel og er laget for å ligge i nettsiden.
- Kontoer lages med engangskoder fra treneren. Ingen e-post sendes.

Innhold som kalender, perioder og spillmodell endres i databasen, ikke her.
