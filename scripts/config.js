Hooks.once('init', function() {
  game.settings.register("aaaa", "applyOnCritSave", {
    name: "On fumbled Saving Throw",
    hint: "Prompt for a lingering injury roll on a fumbled saving throw.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register("aaaa", "applyOnCrit", {
    name: "On Critical",
    hint: "Prompt for a lingering injury roll on a critical hit.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register("aaaa", "applyOnDamage", {
    name: "On Damage",
    hint: "Prompt for a lingering injury roll when the damage recived is more than half of the max hp.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register("aaaa", "applyOnDown", {
    name: "On Unconscious",
    hint: "Prompt for a lingering injury roll when damage brings an actor to 0 hp.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register("aaaa", "nonMidiAutomation", {
    name: "Enable non-midiqol automatins",
    hint: "Enables some automation in the event that you are not using midiqol or you are removing hp manually. The only automations working are the 'On Unconscious' and 'On Damage'. Since the system does not know what type of damage triggered the injury the player will be prompted with the choice.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register("aaaa", "triggerNpc", {
    name: "Trigger Injuries on NPCs",
    hint: "Enables the automations on non player owned actors.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register("aaaa", "selfdestruct", {
    name: "Destroy items",
    hint: "When active effects expire, destroy the injury item. (requires DAE/MidiQoL)",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

});

Hooks.once('ready', async function() {

});

Hooks.on("chatMessage", (ChatLog, content) => {
    if (content.toLowerCase().startsWith("/aaaa")) {
      const data = content.replace("/aaaa", "").trim();
      if(data){
        AlexandersAcrimoniousAfflictions.rollTable(data);
      }else{
        AlexandersAcrimoniousAfflictions.displayDialog();
      }

      return false;
    }
  });

Hooks.on("renderChatMessage", (message, html)=>{
    if(!game.user.isGM || !message?.flavor?.includes("[AAAA]")) return;
    const subTables = ["Scar Chart", "Small Appendage Table", "Large Limb Table"];
    for(let t of subTables){
      if(message?.flavor?.includes(t)) return;
    }
    const button = $(`<a title="Apply Lingering Injury" style="margin-right: 0.3rem;color: red;" class="button"><i class="fas fa-viruses"></i></a>`)
    html.find(".result-text").prepend(button)
    button.on("click", async (e)=>{
        e.preventDefault();
        let actor = game.scenes.get(message?.speaker?.scene)?.tokens?.get(message?.speaker?.token)?.actor;
        actor = actor ?? (game.actors.get(message?.speaker?.actor) ?? _token?.actor);
        if(!actor) return ui.notifications.error("No token selected or actor found!");
        const content = $(message.content)
        const imgsrc = content.find("img").attr("src");
        const description = content.find(".result-text").html();
        const duration = AlexandersAcrimoniousAfflictions.inferDuration(content.find(".result-text").text());
        const title = "Lingering Injury - " + content.find("strong").first().text();
        const itemData = {
            name: title,
            img: imgsrc,
            type: "feat",
            "system.description.value": description,
            flags: {
              aaaa: 
              {
                lingeringInjury: true
              }
            },
            "effects": [
              {
                icon: imgsrc,
                label: title,
                transfer: true,
                changes: [
                  {
                    "key": "flags.dae.deleteOrigin",
                    "value":  game.settings.get("aaaa", "selfdestruct") ? 1 : "",
                    "mode": 2,
                    "priority": 0
                  }
                ],
                duration: {
                  seconds: title.includes("(") ? null : duration || 9999999999,
                },
                flags: {
                  aaaa: 
                  {
                    lingeringInjury: true
                  },
                  "dfreds-convenient-effects": {
                    "description": description,
                  },
                },
              }
            ],
        }
        actor.createEmbeddedDocuments("Item", [itemData]);
        ui.notifications.notify(`Added ${title} to ${actor.name}`)
    });
});

let AlexandersAcrimoniousAfflictionsSocket;

Hooks.once("socketlib.ready", () => {
  AlexandersAcrimoniousAfflictionsSocket = socketlib.registerModule("aaaa");
  AlexandersAcrimoniousAfflictionsSocket.register("requestRoll", AlexandersAcrimoniousAfflictions.requestRoll);
});