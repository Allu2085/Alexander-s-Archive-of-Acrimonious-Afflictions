Hooks.on("midi-qol.RollComplete", async (workflow) => {
  let timeout = 0;
  if (!workflow.item?.hasDamage || workflow.hitTargets.size === 0) return;
  while(!workflow.damageList && timeout < 100) {
    await AlexandersAcrimoniousAfflictions.sleep(500);
    timeout++;
  }
  if(!workflow.damageList) return;
  const applyOnCritSave = game.settings.get("aaaa", "applyOnCritSave");
  const applyOnCrit = game.settings.get("aaaa", "applyOnCrit");
  const applyOnDamage = game.settings.get("aaaa", "applyOnDamage");
  const triggerNpc = game.settings.get("aaaa", "triggerNpc");
  for (let target of workflow.damageList) {
    const token = await fromUuid(target.tokenUuid)
    const actor = token.actor;
    const applyOnDown = game.settings.get("aaaa", "applyOnDown") && actor.hasPlayerOwner;
    if(!actor.hasPlayerOwner && !triggerNpc) continue;
    const hpMax = actor.system.attributes.hp.max;
    const damageTaken = target.hpDamage;
    const isHalfOrMore = damageTaken >= hpMax / 2;
    const damageType = workflow.damageDetail[0].type;
    const save = workflow.saveDisplayData?.find((s) => s.id === target.tokenId);
    const isCritSave = save?.rollDetail?.terms[0]?.results?.find(result => result.active)?.result === 1;
    const isCrit = workflow.isCritical;
    const isDead = target.newHP <= 0;
    if (isHalfOrMore && applyOnDamage) {
      AlexandersAcrimoniousAfflictionsSocket.executeForEveryone("requestRoll",
        "Damage exeeded half of maximum hp",
        damageType,
        actor.id
      );
      continue;
    }
    if (isCritSave && applyOnCritSave) {
      AlexandersAcrimoniousAfflictionsSocket.executeForEveryone("requestRoll",
        "Fumbled saving throw",
        damageType,
        actor.id
      );
      continue;
    }
    if (isCrit && applyOnCrit) {
      AlexandersAcrimoniousAfflictionsSocket.executeForEveryone("requestRoll","Critical hit", damageType, actor.id);
      continue;
    }
    if (isDead && applyOnDown) {
      AlexandersAcrimoniousAfflictionsSocket.executeForEveryone("requestRoll","Downed", damageType, actor.id);
      continue;
    }
  }
});

Hooks.on("preUpdateActor", (actor,updates, diff)=>{diff.prevHp = actor.system.attributes.hp.value});

Hooks.on("updateActor", (actor, updates, diff)=>{
  if(!game.user.isGM || updates.damageItem || updates?.system?.attributes?.hp?.value === undefined) return;
  const triggerNpc = game.settings.get("aaaa", "triggerNpc");
  if(!actor.hasPlayerOwner && !triggerNpc) return;
  if(!game.settings.get("aaaa", "nonMidiAutomation")) return;
  const applyOnDamage = game.settings.get("aaaa", "applyOnDamage");
  const applyOnDown = game.settings.get("aaaa", "applyOnDown") && actor.hasPlayerOwner;
  const hpMax = actor.system.attributes.hp.max;
  const damageTaken = actor.system.attributes.hp.value - diff.prevHp;
  if(damageTaken >= 0) return;
  const isHalfOrMore = Math.abs(damageTaken) >= hpMax / 2;
  const isDead = actor.system.attributes.hp.value <= 0;
  if (isHalfOrMore && applyOnDamage) {
    AlexandersAcrimoniousAfflictionsSocket.executeForEveryone("requestRoll",
      "Damage exeeded half of maximum hp",
      undefined,
      actor.id
    );
    return;
  }
  if (isDead && applyOnDown) {
    AlexandersAcrimoniousAfflictionsSocket.executeForEveryone("requestRoll","Downed", undefined, actor.id);
    return;
  }
})