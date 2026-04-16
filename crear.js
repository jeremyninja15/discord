const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function getCrearBotEmbed() {

  const embed = new EmbedBuilder()
    .setColor("Purple")
    .setTitle("ðŸ¤– Crear tu bot paso a paso (PRO)")
    .setDescription(`
ðŸš€ Sigue estos pasos para crear tu bot completo:

**1ï¸âƒ£ Crear aplicaciÃ³n**
ðŸ‘‰ Ve a:
https://discord.com/developers/applications  
ðŸ‘‰ "New Application" â†’ crea tu bot

**2ï¸âƒ£ Crear el BOT**
ðŸ‘‰ Entra en "Bot" â†’ "Add Bot"

**3ï¸âƒ£ Obtener TOKEN**
ðŸ‘‰ Bot â†’ Reset Token â†’ cÃ³pialo ðŸ”‘

**4ï¸âƒ£ Obtener CLIENT ID**
ðŸ‘‰ "General Information" â†’ copia el ID

**5ï¸âƒ£ CÃ³digo del bot**
ðŸ‘‰ Usa el comando:
/codigo

ðŸ’» AhÃ­ tendrÃ¡s el GitHub con todos los archivos

**6ï¸âƒ£ Crear cuenta en Railway**
ðŸ‘‰ https://railway.app  
ðŸ‘‰ Inicia sesiÃ³n con GitHub

**7ï¸âƒ£ Subir el bot**
ðŸ‘‰ Conecta tu repo de GitHub  
ðŸ‘‰ Railway detecta automÃ¡ticamente el proyecto

**8ï¸âƒ£ Variables de entorno**
ðŸ‘‰ En Railway agrega:

TOKEN=tu_token  
CLIENT_ID=tu_id  

**9ï¸âƒ£ Iniciar bot**
ðŸ‘‰ Railway lo ejecuta automÃ¡ticamente ðŸš€

ðŸ”Ÿ Invitar el bot
ðŸ‘‰ Usa:
/invite

ðŸ”¥ Â¡Y listo! Tu bot estarÃ¡ online 24/7
`);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("codigo_btn")
      .setLabel("ðŸ’» Ver cÃ³digo")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("archivos")
      .setLabel("ðŸ“„ Archivos base")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("zip")
      .setLabel("ðŸ“¦ Descargar bot")
      .setStyle(ButtonStyle.Success)
  );

  return { embed, row };
}

module.exports = { getCrearBotEmbed };
