function renderSparkline(svgId, values, color) {
    const svg = document.getElementById(svgId);
    if (!svg) return;
    const validVals = values.filter(v => v !== null && !isNaN(v));
    if (validVals.length < 2) return;

    const minV = Math.min(...validVals);
    const maxV = Math.max(...validVals);
    const rangeV = (maxV - minV) || 1.0;

    const width = 60;
    const height = 26;
    const padding = 3;
    const usableH = height - (padding * 2);

    const points = values.map((val, i) => {
        if (val === null || isNaN(val)) return null;
        const x = (i / Math.max(1, values.length - 1)) * width;
        const y = height - padding - (((val - minV) / rangeV) * usableH);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).filter(p => p !== null);

    if (points.length === 0) return;
    svg.innerHTML = `<path d="M ${points.join(' L ')}" stroke="${color}" />`;
}

function updateBadge(badgeId, delta, reverse = false) {
    const el = document.getElementById(badgeId);
    if (!el) return;
    const sign = delta >= 0 ? '+' : '';
    const formatted = `${sign}${delta.toFixed(1)}`;
    el.textContent = formatted;
    
    const isGood = reverse ? delta <= 0 : delta >= 0;
    el.className = `trend-badge ${isGood ? 'up' : 'down'}`;
}

function renderLatestActivity(dataArray) {
    const actRows = dataArray.filter(d => {
        const t = String(d['Train type'] || '').trim();
        const validSport = t !== '' && t.toLowerCase() !== 'nan' && t.toLowerCase() !== 'none';
        const distVal = parseFloat(d['distanza'] || d['dist_km']);
        const validDist = !isNaN(distVal) && distVal > 0;
        const tssVal = parseFloat(d['TSS'] || d['hrTSS'] || d['hrTSS_run_bike_corrected']);
        const validTss = !isNaN(tssVal) && tssVal > 0;
        return validSport || validDist || validTss;
    });
    if (actRows.length === 0) return;

    const last = actRows[actRows.length - 1];

    function getVal(obj, ...keys) {
        for (const k of keys) {
            if (obj[k] !== undefined && obj[k] !== null && !isNaN(obj[k])) {
                return parseFloat(obj[k]);
            }
        }
        return null;
    }

    const sport = last['Train type'] || 'Ciclismo';
    const sLow = sport.toLowerCase();
    const isSwim = sLow.includes('swim') || sLow.includes('nuoto');
    const isRun = sLow.includes('run') || sLow.includes('corsa') || sLow.includes('trail');
    const isBike = sLow.includes('bike') || sLow.includes('ride') || sLow.includes('ciclismo');
    let icon = '🏋️';
    let displaySport = sport;
    if (sLow.includes('motocross') || sLow.includes('mx') || sLow.includes('pista') || sLow.includes('moto')) {
        icon = '🏍️';
        displaySport = sLow.includes('cumulate') ? sport : 'Motocross';
    } else if (isBike) {
        icon = '🚴';
        displaySport = sLow.includes('cumulate') ? sport.replace(/ride/i, 'Ciclismo').replace(/bike/i, 'Ciclismo') : 'Ciclismo';
    } else if (isRun) {
        icon = '🏃';
        displaySport = sLow.includes('cumulate') ? sport.replace(/run/i, 'Corsa') : 'Corsa';
    } else if (isSwim) {
        icon = '🏊';
        displaySport = 'Nuoto';
    }

    const day = last['day'], month = last['month'], year = last['year'];
    let dateStr = day && month ? `${day}/${month}/${year}` : 'Oggi';
    if (day && month && year) {
        const today = new Date();
        if (day === today.getDate() && month === (today.getMonth() + 1) && year === today.getFullYear()) {
            dateStr = `${day}/${month}/${year} (Oggi)`;
        } else {
            const yest = new Date(today);
            yest.setDate(yest.getDate() - 1);
            if (day === yest.getDate() && month === (yest.getMonth() + 1) && year === yest.getFullYear()) {
                dateStr = `${day}/${month}/${year} (Ieri)`;
            } else {
                dateStr = `${day}/${month}/${year}`;
            }
        }
    }

    const dist = getVal(last, 'distanza', 'dist_km');
    const dur = getVal(last, 'durata min');
    const elevation = getVal(last, 'dislivello');
    const paceVal = getVal(last, 'min/km', 'passo_medio');
    const npVal = getVal(last, 'NP', 'np', 'normalized_power');
    const wattVal = getVal(last, '@watt', 'Watts', 'watt', 'power');
    const tss = getVal(last, 'TSS');
    const ifVal = getVal(last, 'IF');
    const hr = getVal(last, 'HR media', 'hr_media');
    const hrMax = getVal(last, 'HR max', 'hr_max');
    const ef = getVal(last, 'EF');
    const efCorr = getVal(last, 'EF_CORRETTO');
    const pahr = last['Pa:Hr'] || 'N/D';
    const temp = getVal(last, 'TEMP');
    const note = last['note'] || 'Nessuna nota aggiuntiva per questa sessione.';

    let durStr = 'N/D';
    if (dur) {
        const hrs = Math.floor(dur / 60);
        const mins = Math.floor(dur % 60);
        durStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`;
    }

    let distDisplay = dist !== null ? `${dist.toFixed(1)} km` : 'N/D';
    if (isSwim && dist) {
        const distM = dist < 20 ? Math.round(dist * 1000) : Math.round(dist);
        distDisplay = `${distM.toLocaleString('it-IT')} m (${(distM/1000).toFixed(2)} km)`;
    }

    let distSubStr = durStr;
    if (elevation !== null && elevation > 0) {
        distSubStr += ` | +${Math.round(elevation)}m D+`;
    }
    if (isSwim) {
        const distM = dist ? (dist < 20 ? Math.round(dist * 1000) : Math.round(dist)) : 1500;
        const paceSec100 = (dur && distM) ? (dur * 60) / (distM / 100) : 97.3;
        const pM = Math.floor(paceSec100 / 60);
        const pS = Math.round(paceSec100 % 60).toString().padStart(2, '0');
        distSubStr = `${durStr} | Passo: ${pM}:${pS} /100m`;
    } else if (isRun && paceVal !== null && paceVal > 0) {
        const speedKmh = (60.0 / paceVal).toFixed(1);
        distSubStr += ` | ${speedKmh} km/h`;
    } else if (dist && dur && dur > 0) {
        const speedKmh = (dist / (dur / 60.0)).toFixed(1);
        distSubStr += ` | ${speedKmh} km/h`;
    }

    const setEl = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    let powerValStr = 'N/D';
    let powerSubStr = 'Nessun Wattometro';
    if (isSwim) {
        setEl('act-power-label', 'Passo Medio (min/100m)');
        const distM = dist ? (dist < 20 ? Math.round(dist * 1000) : Math.round(dist)) : 1500;
        const paceSec100 = (dur && distM) ? (dur * 60) / (distM / 100) : 97.3;
        const pM = Math.floor(paceSec100 / 60);
        const pS = Math.round(paceSec100 % 60).toString().padStart(2, '0');
        const swimPaceStr = `${pM}:${pS} /100m`;
        powerValStr = swimPaceStr;
        const cssSec = 90.0; // 1:30/100m (Soglia Critica Nuoto CSS)
        const ifSwim = (cssSec / paceSec100).toFixed(2);
        powerSubStr = `Soglia CSS: 1:30 /100m (IF ${ifSwim})`;
    } else if (isRun) {
        setEl('act-power-label', 'Passo Medio (min/km)');
        if (paceVal !== null && paceVal > 0) {
            const pMins = Math.floor(paceVal);
            const pSecs = Math.round((paceVal % 1) * 60).toString().padStart(2, '0');
            powerValStr = `${pMins}':${pSecs}" /km`;
            powerSubStr = `${paceVal.toFixed(2)} min/km`;
        } else {
            powerValStr = 'N/D';
            powerSubStr = 'Passo di Corsa';
        }
    } else {
        setEl('act-power-label', 'Potenza (NP / Media)');
        if (npVal !== null && npVal > 0 && wattVal !== null && wattVal > 0) {
            powerValStr = `${Math.round(npVal)} W (NP)`;
            powerSubStr = `Media: ${Math.round(wattVal)} W`;
        } else if (npVal !== null && npVal > 0) {
            powerValStr = `${Math.round(npVal)} W (NP)`;
            powerSubStr = 'Normalized Power';
        } else if (wattVal !== null && wattVal > 0) {
            powerValStr = `${Math.round(wattVal)} W`;
            powerSubStr = 'Potenza Media';
        }
    }

    const tssRaw = (wattVal !== null && wattVal > 0) ? getVal(last, 'TSS') : null;
    const hrtssCorr = getVal(last, 'hrTSS_run_bike_corrected', 'hrTSS');
    const hasHr = hr !== null && hr > 0;

    let tssStr = 'N/D';
    let tssSubStr = '';
    if (tssRaw !== null && hrtssCorr !== null && hrtssCorr > 0 && hasHr) {
        const ratio = tssRaw / hrtssCorr;
        tssStr = `${tssRaw.toFixed(1)} TSS / ${hrtssCorr.toFixed(1)} hrTSS`;
        tssSubStr = `Rapporto TSS/hrTSS: ${ratio.toFixed(2)}`;
    } else if (tssRaw !== null && tssRaw > 0) {
        tssStr = `${tssRaw.toFixed(1)} TSS`;
        tssSubStr = ifVal !== null ? `IF ${ifVal.toFixed(2)} (Pure Power TSS)` : 'Pure Power TSS';
    } else if (hrtssCorr !== null && hrtssCorr > 0) {
        tssStr = `${hrtssCorr.toFixed(1)} hrTSS`;
        tssSubStr = 'Pure hrTSS (Termoregolato)';
    }

    // EF calculation & display
    let displayEf = 'N/D';
    let displayEfSub = 'Nessuna Fascia Cardio';
    if (ef !== null && !isNaN(ef)) {
        displayEf = ef.toFixed(2);
        if (efCorr !== null && !isNaN(efCorr)) {
            displayEfSub = `Corr: ${efCorr.toFixed(2)}`;
        } else {
            displayEfSub = 'EF Termoregolato';
        }
    } else if (hasHr) {
        displayEfSub = 'In Attesa Dati EF';
    }

    // Pa:Hr calculation & display (Joe Friel / WKO Steady-State Protocol)
    let displayPahr = 'N/D';
    let displayPahrSub = temp !== null ? `Temp: ${Math.round(temp)}°C` : '';
    if (pahr && pahr !== 'nan' && pahr !== 'N/D' && pahr !== 'NaN' && !String(pahr).startsWith('N/D')) {
        displayPahr = String(pahr);
        const pNum = parseFloat(displayPahr.replace('%', '').replace('+', '').trim());
        if (!isNaN(pNum)) {
            const tempPart = temp !== null ? ` • ${Math.round(temp)}°C` : '';
            if (pNum <= 5.0) {
                displayPahrSub = `Stabile (Accoppiato)${tempPart}`;
            } else if (pNum <= 7.5) {
                displayPahrSub = `Lieve Deriva${tempPart}`;
            } else {
                displayPahrSub = `Disaccoppiato${tempPart}`;
            }
        }
    } else {
        displayPahr = 'N/D';
        displayPahrSub = temp !== null ? `Non Steady • ${Math.round(temp)}°C` : 'Non Steady-State';
    }

    setEl('act-icon', icon);
    setEl('act-title', `Ultima Attività (${displaySport})`);
    setEl('act-meta', dateStr);
    setEl('act-dist', distDisplay);
    setEl('act-dur', distSubStr);
    setEl('act-power', powerValStr);
    setEl('act-power-sub', powerSubStr);
    setEl('act-tss', tssStr);
    setEl('act-if', tssSubStr);
    setEl('act-hr', hr !== null ? `${Math.round(hr)} bpm` : 'N/D');
    setEl('act-hrmax', hrMax !== null ? `Max: ${Math.round(hrMax)} bpm` : '');
    if (isSwim) {
        displayEf = powerValStr;
        displayEfSub = hasHr ? `FC ${Math.round(hr)} bpm (Z1 Rigenerante)` : 'Z1 Rigenerante';
    }
    setEl('act-ef', displayEf);
    setEl('act-ef-corr', displayEfSub);
    setEl('act-pahr', displayPahr);
    setEl('act-temp', displayPahrSub);
    let displayNote = (note && note !== 'nan' && note.trim() !== '') ? note : 'Nessuna nota aggiuntiva per questa sessione.';
    if (isSwim) {
        if (!note || note === 'nan' || note.trim() === '' || note.includes('Nessuna nota')) {
            displayNote = `🏊 Nuoto Aerobico: ${distDisplay} in ${durStr} @ ${powerValStr} con soli ${hr !== null ? Math.round(hr) : '--'} bpm medi (Soglia CSS: 1:30 /100m). Decompressione lombare e recupero vagale a zero impatto ortopedico.`;
        }
    } else if (sLow.includes('motocross') || sLow.includes('mx') || sLow.includes('pista') || sLow.includes('moto')) {
        if (!note || note === 'nan' || note.trim() === '' || note.includes('Nessuna nota')) {
            displayNote = '⚡ Extra TSS Neuromuscolare (+25%): Calcolo del carico integrato con il moltiplicatore per consumo neuromuscolare, isometrico ed impegno adrenalinico da guida MX.';
        }
    }
    setEl('act-note', displayNote);

    // Dynamic Coloring based on athlete standards & trend:
    // Regola Utente: Distanza, Carico (TSS) e FC devono avere i numeri in bianco (neutro).
    // EF, Decoupling (Pa:Hr) e Passo/Potenza sono colorati Verde, Giallo o Rosso rispetto alla tendenza.
    function setCardStatus(cardId, status) {
        const el = document.getElementById(cardId);
        if (!el) return;
        el.classList.remove('status-good', 'status-warn', 'status-bad');
        if (status === 'good') el.classList.add('status-good');
        else if (status === 'warn') el.classList.add('status-warn');
        else if (status === 'bad') el.classList.add('status-bad');
    }

    // 1. Distanza & Tempo -> Neutro (numeri in bianco)
    setCardStatus('card-act-dist', null);

    // 2. Carico Allenamento (TSS) -> Neutro (numeri in bianco)
    setCardStatus('card-act-tss', null);

    // 3. FC Media (Movimento) -> Neutro (numeri in bianco)
    setCardStatus('card-act-hr', null);

    // 4. Potenza / Passo (confronto con la tendenza recente dell'atleta)
    if (isSwim) {
        setCardStatus('card-act-power', 'good');
    } else if (isRun && paceVal !== null && paceVal > 0) {
        const prevRuns = dataArray.filter(d => d !== last && String(d['Train type']||'').toLowerCase() === 'run' && (d['min/km'] || d['passo_medio']));
        let trendPace = 5.35;
        if (prevRuns.length > 0) {
            const pSlice = prevRuns.slice(-5);
            trendPace = pSlice.reduce((acc, r) => acc + parseFloat(r['min/km'] || r['passo_medio']), 0) / pSlice.length;
        }
        if (paceVal <= trendPace * 0.98) {
            setCardStatus('card-act-power', 'good');
        } else if (paceVal <= trendPace * 1.03) {
            setCardStatus('card-act-power', 'warn');
        } else {
            setCardStatus('card-act-power', 'bad');
        }
    } else if (wattVal !== null && wattVal > 0) {
        const prevBikes = dataArray.filter(d => d !== last && parseFloat(d['@watt']) > 0);
        let trendWatt = 175;
        if (prevBikes.length > 0) {
            const wSlice = prevBikes.slice(-5);
            trendWatt = wSlice.reduce((acc, b) => acc + parseFloat(b['@watt']), 0) / wSlice.length;
        }
        if (wattVal >= trendWatt * 1.03) {
            setCardStatus('card-act-power', 'good');
        } else if (wattVal >= trendWatt * 0.95) {
            setCardStatus('card-act-power', 'warn');
        } else {
            setCardStatus('card-act-power', 'bad');
        }
    } else {
        setCardStatus('card-act-power', null);
    }

    // 5. Efficienza Aerobica (EF) (confronto con la tendenza recente della stessa disciplina)
    const effectiveEf = (efCorr !== null && !isNaN(efCorr)) ? efCorr : ef;
    if (effectiveEf !== null && !isNaN(effectiveEf) && effectiveEf > 0) {
        const prevEfs = dataArray.filter(d => {
            if (d === last) return false;
            const t = String(d['Train type'] || '').toLowerCase();
            const matchesSport = isRun ? (t.includes('run') || t.includes('corsa')) : (t.includes('bike') || t.includes('ride') || t.includes('ciclismo'));
            return matchesSport && (parseFloat(d['EF_CORRETTO'] || d['EF']) > 0);
        });
        let trendEf = isBike ? 1.45 : 1.35;
        if (prevEfs.length > 0) {
            const efSlice = prevEfs.slice(-5);
            trendEf = efSlice.reduce((acc, e) => acc + parseFloat(e['EF_CORRETTO'] || e['EF']), 0) / efSlice.length;
        }
        if (effectiveEf >= trendEf * 1.015) {
            setCardStatus('card-act-ef', 'good');
        } else if (effectiveEf >= trendEf * 0.97) {
            setCardStatus('card-act-ef', 'warn');
        } else {
            setCardStatus('card-act-ef', 'bad');
        }
    } else {
        setCardStatus('card-act-ef', null);
    }

    // 6. Disaccoppiamento (Pa:Hr) (confronto con standard Friel / WKO deriva cardiaca)
    if (displayPahr && !displayPahr.startsWith('N/D') && displayPahr !== 'nan') {
        const pVal = parseFloat(displayPahr.replace('%', '').replace('+', '').trim());
        if (!isNaN(pVal)) {
            if (pVal <= 5.0) {
                setCardStatus('card-act-pahr', 'good');
            } else if (pVal <= 7.5) {
                setCardStatus('card-act-pahr', 'warn');
            } else {
                setCardStatus('card-act-pahr', 'bad');
            }
        } else {
            setCardStatus('card-act-pahr', null);
        }
    } else {
        setCardStatus('card-act-pahr', null);
    }
}

function renderDashboard(dataArray) {
    if (!dataArray || dataArray.length === 0) return;

    const historical = dataArray.filter(d => !d.is_projected);
    const latest = historical.length > 0 ? historical[historical.length - 1] : dataArray[dataArray.length - 1];

    if (!latest) return;

    function getVal(obj, ...keys) {
        for (const k of keys) {
            if (obj[k] !== undefined && obj[k] !== null && !isNaN(obj[k])) {
                return parseFloat(obj[k]);
            }
        }
        return null;
    }

    const last30 = historical.slice(-30);
    function getSeries(key) {
        return last30.map(r => getVal(r, key));
    }

    const hrvVal = getVal(latest, 'night HRV', 'night_hrv', 'rmssd_supine', 'rmssd laied');
    const rhrVal = getVal(latest, 'RHR', 'rhr');
    const sleepScoreVal = getVal(latest, 'sleep score', 'sleep_score');
    const tsbVal = getVal(latest, 'TSB', 'tsb_tp', 'tsb');
    const ctlVal = getVal(latest, 'CTL', 'ctl_total', 'ctl_sports', 'ctl');
    const bikeCtlVal = getVal(latest, 'bike_ctl', 'ctl_bike');
    const runCtlVal = getVal(latest, 'run_ctl', 'ctl_run');

    const hrvSeries = getSeries('night HRV');
    const validHrv7d = hrvSeries.slice(-7).filter(v => v !== null);
    const avgHrv7d = validHrv7d.length > 0 ? (validHrv7d.reduce((a,b)=>a+b, 0)/validHrv7d.length) : hrvVal;

    // 1. Readiness Card
    const readinessEl = document.getElementById('kpi-readiness');
    const readinessDescEl = document.getElementById('kpi-readiness-desc');
    const readinessCard = document.getElementById('card-readiness');

    let zone = "READY";
    let color = "#10b981";
    let hrvStr = hrvVal !== null ? Math.round(hrvVal) + 'ms' : '---';
    let rhrStr = rhrVal !== null ? Math.round(rhrVal) + 'bpm' : '---';
    let desc = `HRV ${hrvStr} | FC ${rhrStr} (Parasimpatico OK)`;

    const isStop = (latest.readiness_zone === 'RED' || (hrvVal !== null && hrvVal < 35) || (rhrVal !== null && rhrVal >= 49));
    // Physiological Check N=1: RHR elevated (>= 47) triggers CAREFUL only if HRV is also suppressed
    const isRhrTachy = (rhrVal !== null && rhrVal >= 47 && (hrvVal === null || hrvVal < 42 || (avgHrv7d && hrvVal < avgHrv7d * 0.9)));
    const isHrvSuppressed = (hrvVal !== null && avgHrv7d && hrvVal < avgHrv7d * 0.8) || (hrvVal !== null && hrvVal < 38);
    const isCareful = !isStop && (latest.readiness_zone === 'YELLOW' || isHrvSuppressed || isRhrTachy || (tsbVal !== null && tsbVal < -20) || (sleepScoreVal !== null && sleepScoreVal < 60));
    const isGolden = !isStop && !isCareful && (hrvVal && avgHrv7d && hrvVal > (avgHrv7d * 1.15) && rhrVal && rhrVal <= 43);

    if (isStop) {
        zone = "STOP";
        color = "#ef4444";
        desc = `Stress Severo / Riposo Consigliato | HRV ${hrvStr} | FC ${rhrStr}`;
    } else if (isCareful) {
        zone = "CAREFUL";
        color = "#f59e0b";
        desc = `Fatica Autonomica / Scarico Consigliato (HRV ${hrvStr} | FC ${rhrStr} | TSB ${tsbVal ? Math.round(tsbVal) : '---'})`;
    } else if (isGolden) {
        const pctUp = avgHrv7d ? Math.round(((hrvVal - avgHrv7d) / avgHrv7d) * 100) : 15;
        zone = "GOLDEN DAY";
        color = "#fbbf24"; // Distinctive Premium Gold
        desc = `Peak Vagale Eccellente | HRV ${hrvStr} (+${pctUp}% vs 7d) | FC ${rhrStr}`;
    } else {
        const pctUp = (hrvVal && avgHrv7d && hrvVal > avgHrv7d) ? ` (+${Math.round(((hrvVal - avgHrv7d) / avgHrv7d) * 100)}%)` : '';
        const tsbSign = (tsbVal && tsbVal > 0) ? '+' : '';
        const tsbDisplay = tsbVal !== null ? `${tsbSign}${Math.round(tsbVal)}` : '---';
        zone = "READY";
        color = "#10b981";
        desc = `Parasimpatico Ricaricato | HRV ${hrvStr}${pctUp} | FC ${rhrStr} | TSB ${tsbDisplay}`;
    }

    const readinessDateBadge = document.getElementById('readiness-date-badge');
    if (readinessDateBadge && latest) {
        const dDay = latest['day'];
        const dMonth = latest['month'];
        const dYear = latest['year'];
        if (dDay && dMonth && dYear) {
            const today = new Date();
            const isToday = dDay === today.getDate() && dMonth === (today.getMonth() + 1) && dYear === today.getFullYear();
            readinessDateBadge.textContent = isToday ? `${dDay}/${dMonth}/${dYear} (OGGI)` : `${dDay}/${dMonth}/${dYear}`;
        }
    }

    if (readinessEl) {
        readinessEl.textContent = zone;
        readinessEl.style.color = color;
    }
    if (readinessDescEl) {
        readinessDescEl.textContent = desc;
        readinessDescEl.style.color = color;
    }
    if (readinessCard) {
        readinessCard.classList.remove('theme-ready', 'theme-golden', 'theme-careful', 'theme-stop');
        const themeCls = zone === 'STOP' ? 'theme-stop' : (zone === 'CAREFUL' ? 'theme-careful' : (zone === 'GOLDEN DAY' ? 'theme-golden' : 'theme-ready'));
        readinessCard.classList.add(themeCls);
        readinessCard.style.borderColor = color;
        readinessCard.style.boxShadow = `0 0 20px ${color}33`;

        // Update mini-histogram bars color to match readiness state
        const bars = readinessCard.querySelectorAll('.mini-histogram .bar');
        bars.forEach(b => {
            b.style.backgroundColor = color;
        });
    }

    // 2. HRV Card
    const hrvDelta = hrvVal !== null && avgHrv7d !== null ? (hrvVal - avgHrv7d) : 0;
    const hrvColor = hrvDelta >= 0 ? '#10b981' : '#ef4444';

    const hrvEl = document.getElementById('kpi-hrv');
    if (hrvEl && hrvVal !== null) {
        hrvEl.innerHTML = `<span style="color:${hrvColor}">${Math.round(hrvVal)} <span style="font-size:0.7em; opacity:0.8;">ms</span></span>`;
    }
    updateBadge('trend-hrv', hrvDelta);
    renderSparkline('spark-hrv', hrvSeries, hrvColor);

    // 3. Sleep Score / RHR Card
    const sleepSeries = getSeries('sleep score');
    const rhrSeries = getSeries('RHR');
    const validSleep7d = sleepSeries.slice(-7).filter(v => v !== null);
    const avgSleep7d = validSleep7d.length > 0 ? (validSleep7d.reduce((a,b)=>a+b, 0)/validSleep7d.length) : sleepScoreVal;
    const sleepDelta = sleepScoreVal !== null && avgSleep7d !== null ? (sleepScoreVal - avgSleep7d) : 0;
    // Rule 1 & 2: Sleep score color must be based on physiological quality threshold, not just daily delta
    const sleepColor = sleepScoreVal === null ? '#94a3b8' : (sleepScoreVal >= 75 ? '#10b981' : (sleepScoreVal >= 60 ? '#38bdf8' : (sleepScoreVal >= 50 ? '#f59e0b' : '#ef4444')));

    const sleepEl = document.getElementById('kpi-sleep');
    if (sleepEl) {
        const sStr = sleepScoreVal !== null ? Math.round(sleepScoreVal) : '---';
        const rStr = rhrVal !== null ? Math.round(rhrVal) : '---';
        const rhrColor = rhrVal === null ? '#94a3b8' : (rhrVal >= 49 ? '#ef4444' : (rhrVal >= 47 ? '#f59e0b' : '#10b981'));
        sleepEl.innerHTML = `<span style="color:${sleepColor}">${sStr}</span> <span style="opacity:0.5;">/</span> <span style="color:${rhrColor}">${rStr} <span style="font-size:0.65em;">bpm</span></span>`;
    }
    updateBadge('trend-sleep', sleepDelta);
    renderSparkline('spark-sleep', sleepSeries, sleepColor);

    // 4. Bilancio TSB Card
    const tsbSeries = getSeries('TSB');
    const tsb7dAgo = tsbSeries.length >= 7 && tsbSeries[tsbSeries.length - 7] !== null ? tsbSeries[tsbSeries.length - 7] : tsbVal;
    const tsbDelta = tsbVal !== null && tsb7dAgo !== null ? (tsbVal - tsb7dAgo) : 0;
    const roundedTsb = tsbVal !== null ? Math.round(tsbVal) : 0;
    const tsbColor = roundedTsb >= 5 ? '#3b82f6' : (roundedTsb >= -15 ? '#10b981' : (roundedTsb >= -25 ? '#f59e0b' : '#ef4444'));

    const tsbEl = document.getElementById('kpi-tsb');
    const tsbSubEl = document.getElementById('kpi-tsb-sub');
    const acwrVal = getVal(latest, 'ACWR', 'acwr');

    if (tsbEl && tsbVal !== null) {
        const tsbDisplay = Math.abs(tsbVal % 1) > 0.05 ? tsbVal.toFixed(1) : Math.round(tsbVal).toString();
        tsbEl.innerHTML = `<span style="color:${tsbColor}">${tsbVal > 0 ? '+' : ''}${tsbDisplay}</span> <span style="font-size:0.7em; opacity:0.8;">TSB</span>`;
    }
    if (tsbSubEl && acwrVal !== null) {
        const acwrNum = parseFloat(acwrVal);
        const acwrColor = acwrNum > 1.5 ? '#ef4444' : (acwrNum >= 0.8 && acwrNum <= 1.3 ? '#10b981' : '#f59e0b');
        tsbSubEl.innerHTML = `<span style="color:${acwrColor}; font-weight:600;">ACWR ${acwrNum.toFixed(2)}</span>`;
    }
    updateBadge('trend-tsb', tsbDelta);
    renderSparkline('spark-tsb', tsbSeries, tsbColor);

    // 5. Total CTL Card (Brand Color #38bdf8, delta badge carries trend)
    const ctlSeries = getSeries('CTL');
    const ctl7dAgo = ctlSeries.length >= 7 && ctlSeries[ctlSeries.length - 7] !== null ? ctlSeries[ctlSeries.length - 7] : ctlVal;
    const ctlDelta = ctlVal !== null && ctl7dAgo !== null ? (ctlVal - ctl7dAgo) : 0;
    const ctlColor = '#38bdf8';

    const totalCtlEl = document.getElementById('kpi-total-ctl');
    if (totalCtlEl && ctlVal !== null) {
        totalCtlEl.innerHTML = `<span style="color:${ctlColor}">${ctlVal.toFixed(1)}</span> <span style="font-size:0.7em; opacity:0.8;">CTL</span>`;
    }
    updateBadge('trend-total-ctl', ctlDelta);
    renderSparkline('spark-total-ctl', ctlSeries, ctlColor);

    // 6. Bike CTL Card (Brand Color #60a5fa, delta badge carries trend)
    const bikeCtlSeries = getSeries('bike_ctl');
    const bCtl7dAgo = bikeCtlSeries.length >= 7 && bikeCtlSeries[bikeCtlSeries.length - 7] !== null ? bikeCtlSeries[bikeCtlSeries.length - 7] : bikeCtlVal;
    const bCtlDelta = bikeCtlVal !== null && bCtl7dAgo !== null ? (bikeCtlVal - bCtl7dAgo) : 0;
    const bCtlColor = '#60a5fa';

    const bikeCtlEl = document.getElementById('kpi-bike-ctl');
    if (bikeCtlEl && bikeCtlVal !== null) {
        bikeCtlEl.innerHTML = `<span style="color:${bCtlColor}">${bikeCtlVal.toFixed(1)}</span> <span style="font-size:0.7em; opacity:0.8;">CTL</span>`;
    }
    const bAtlVal = getVal(latest, 'bike_atl', 'atl_bike');
    const bCtlSubEl = document.getElementById('kpi-bike-ctl-sub');
    if (bCtlSubEl && bikeCtlVal !== null && bAtlVal !== null && bikeCtlVal > 0) {
        const bAcwr = bAtlVal / bikeCtlVal;
        const bAcwrColor = bAcwr > 1.5 ? '#ef4444' : (bAcwr >= 0.8 && bAcwr <= 1.3 ? '#10b981' : '#38bdf8');
        bCtlSubEl.innerHTML = `<span style="color:${bAcwrColor}; font-weight:600;">ACWR ${bAcwr.toFixed(2)}</span>`;
    }
    updateBadge('trend-bike-ctl', bCtlDelta);
    renderSparkline('spark-bike-ctl', bikeCtlSeries, bCtlColor);

    // 7. Run CTL Card (Brand Color #34d399, delta badge carries trend)
    const runCtlSeries = getSeries('run_ctl');
    const rCtl7dAgo = runCtlSeries.length >= 7 && runCtlSeries[runCtlSeries.length - 7] !== null ? runCtlSeries[runCtlSeries.length - 7] : runCtlVal;
    const rCtlDelta = runCtlVal !== null && rCtl7dAgo !== null ? (runCtlVal - rCtl7dAgo) : 0;
    const rCtlColor = '#34d399';

    const runCtlEl = document.getElementById('kpi-run-ctl');
    if (runCtlEl && runCtlVal !== null) {
        runCtlEl.innerHTML = `<span style="color:${rCtlColor}">${runCtlVal.toFixed(1)}</span> <span style="font-size:0.7em; opacity:0.8;">CTL</span>`;
    }
    const rAtlVal = getVal(latest, 'run_atl', 'atl_run');
    const rCtlSubEl = document.getElementById('kpi-run-ctl-sub');
    if (rCtlSubEl && runCtlVal !== null && rAtlVal !== null && runCtlVal > 0) {
        const rAcwr = rAtlVal / runCtlVal;
        const rAcwrColor = rAcwr > 1.3 ? '#ef4444' : (rAcwr >= 0.8 && rAcwr <= 1.3 ? '#10b981' : '#38bdf8');
        rCtlSubEl.innerHTML = `<span style="color:${rAcwrColor}; font-weight:600;">ACWR ${rAcwr.toFixed(2)}</span>`;
    }
    updateBadge('trend-run-ctl', rCtlDelta);
    renderSparkline('spark-run-ctl', runCtlSeries, rCtlColor);

    // Render Latest Activity
    renderLatestActivity(dataArray);
    window.lastDataArray = dataArray;
    if (typeof updateBentoView === "function") updateBentoView();

    // Save latest row & scan backwards for the latest valid dynamic weight
    window._latestRow = latest;
    let latestValidWeight = null;
    for (let i = dataArray.length - 1; i >= 0; i--) {
        const w = getVal(dataArray[i], 'kg', 'Weight', 'weight');
        if (w !== null && !isNaN(w) && w > 40 && w < 150) {
            latestValidWeight = w;
            break;
        }
    }
    window._currentWeight = latestValidWeight;
    updateContextCommandBar(window._lastLifestyleContext, window._lastPrep);
}

function updateContextCommandBar(lifestyleContext, prep) {
    const pillLoc = document.getElementById('pill-location');
    const pillSeason = document.getElementById('pill-season');
    const pillTargetCtl = document.getElementById('pill-target-ctl');
    const pillWeight = document.getElementById('pill-weight');

    if (pillLoc && lifestyleContext) {
        if (lifestyleContext.is_travel) {
            pillLoc.className = 'context-pill location-pill travel-mode';
            pillLoc.innerHTML = `✈️ <strong>${lifestyleContext.status}</strong>`;
            pillLoc.title = lifestyleContext.advice || 'Trasferta con la squadra di vela';
        } else {
            pillLoc.className = 'context-pill location-pill';
            pillLoc.innerHTML = `🏠 <strong>HOME BASE (CASA)</strong>`;
            pillLoc.title = lifestyleContext.advice || 'A casa: focus su recupero e qualità';
        }
    }

    if (pillSeason) {
        const month = (new Date()).getMonth() + 1;
        let seasonText = "🍂 FASE 1: BASE Z2 & HYROX";
        if (month >= 2 && month <= 4) {
            seasonText = "🌱 FASE 2: COSTRUZIONE & SWEETSPOT";
        } else if (month >= 5 && month <= 7) {
            seasonText = "☀️ FASE 3: PICCO FORMA & GARE";
        } else if (month >= 8 && month <= 9) {
            seasonText = "🌾 FASE 4: ENDURANCE & TRANSIZIONE";
        }
        pillSeason.innerHTML = seasonText;
    }

    if (pillTargetCtl) {
        const prepObj = prep || window._lastPrep;
        const currentCtl = (prepObj && prepObj.ctl) ? prepObj.ctl.toFixed(1) : (window._latestRow && window._latestRow.CTL ? parseFloat(window._latestRow.CTL).toFixed(1) : '---');
        pillTargetCtl.innerHTML = `🎯 TARGET LONGEVITY: <strong>52 CTL</strong> (Attuale: ${currentCtl})`;
    }

    if (pillWeight) {
        const weight = window._currentWeight || (window._latestRow ? (window._latestRow.kg || window._latestRow.Weight || window._latestRow.weight) : null);
        const weightStr = (weight && !isNaN(weight) && parseFloat(weight) > 0) ? `${parseFloat(weight).toFixed(1)} kg` : null;
        pillWeight.innerHTML = `⚖️ TARGET PESO: <strong>82–83 kg</strong>${weightStr ? ` (Attuale: ${weightStr})` : ''}`;
    }
}

function loadRacePrep() {
    fetch('/api/race_prep')
        .then(res => res.json())
        .then(prep => {
            if (!prep) return;
            const targetBadge = document.getElementById('race-target-badge');
            const targetName = document.getElementById('target-race-name');
            const targetCountdown = document.getElementById('target-race-countdown');
            const prepText = document.getElementById('prep-pct-text');
            const prepStageText = document.getElementById('prep-stage-text');
            const prepGaugeCircle = document.getElementById('prep-gauge-circle');
            const currentCtlEl = document.getElementById('prep-current-ctl');
            const targetCtlEl = document.getElementById('prep-target-ctl');
            const prepExplanation = document.getElementById('prep-explanation-text');
            const upcomingList = document.getElementById('upcoming-events-list');

            const evt = prep.target_event;
            if (evt) {
                if (targetBadge) targetBadge.textContent = `🎯 ${evt.name} (${prep.prep_pct}%)`;
                if (targetName) targetName.textContent = `🚴 ${evt.name}`;
                if (targetCountdown) targetCountdown.textContent = `${evt.date_fmt} (tra ${evt.days_left} gg)`;
            } else {
                if (targetBadge) targetBadge.textContent = `🌿 Mantenimento Longevity (${prep.prep_pct || 100}%)`;
                if (targetName) targetName.textContent = `🌿 Transizione & Mantenimento Aerobico`;
                if (targetCountdown) targetCountdown.textContent = `Nessuna Gara in Programma`;
            }

            const pct = Math.min(100, Math.max(0, prep.prep_pct || 0));
            const stage = pct >= 95 ? "PRONTO" : (pct >= 85 ? "TAPERING" : "COSTRUZIONE");
            
            if (prepText) prepText.textContent = `${pct}%`;
            if (prepStageText) {
                prepStageText.textContent = stage;
                prepStageText.style.color = pct >= 90 ? "#10b981" : (pct >= 80 ? "#fbbf24" : "#38bdf8");
            }

            // Circostanza cerchio: 2 * PI * r = 2 * 3.14159 * 40 = 251.2
            if (prepGaugeCircle) {
                const totalCircumference = 251.2;
                const offset = totalCircumference - (pct / 100) * totalCircumference;
                prepGaugeCircle.style.strokeDashoffset = offset.toFixed(1);
            }

            const currentTsbEl = document.getElementById('prep-current-tsb');
            const targetTsbEl = document.getElementById('prep-target-tsb');
            if (currentCtlEl) currentCtlEl.textContent = `${prep.ctl} CTL`;
            if (targetCtlEl) targetCtlEl.textContent = `${prep.target_ctl} CTL`;
            if (currentTsbEl) {
                currentTsbEl.textContent = `${prep.tsb_str} TSB (${prep.tsb_status || ''})`;
                currentTsbEl.style.color = prep.tsb >= 5 ? "#10b981" : (prep.tsb >= 0 ? "#38bdf8" : (prep.tsb >= -15 ? "#fbbf24" : "#ef4444"));
            }
            if (targetTsbEl) {
                targetTsbEl.textContent = `+${prep.target_tsb.toFixed(1)} TSB (Freschezza Gara)`;
            }

            if (prepExplanation) {
                prepExplanation.innerHTML = prep.target_ctl_explanation || `ℹ️ <strong>Formula Contagiri CTL (${prep.target_ctl} CTL):</strong> Rapporto tra il tuo CTL attuale (${prep.ctl}) ed il CTL ideale necessario per l'evento target in calendario (${evt ? evt.name : 'Gara Target'}).`;
            }

            // Store events for filtering
            window._allUpcomingRaces = prep.upcoming || [];
            window._targetRaces = prep.target_races || [];

            function renderFilteredEvents(discipline) {
                if (!upcomingList) return;
                let html = '';
                
                // Show other target races if "all" or matching
                if (window._targetRaces && window._targetRaces.length > 1) {
                    window._targetRaces.slice(1).forEach(r => {
                        if (discipline === 'all' || r.discipline === discipline) {
                            html += `
                            <div style="display: flex; justify-content: space-between; font-size: 0.78rem; padding: 0.35rem 0.5rem; background: rgba(251, 191, 36, 0.08); border-left: 3px solid #fbbf24; border-radius: 6px;">
                                <span>🏆 <strong>${r.name}</strong> (${r.distances || 'Gara Target'})</span>
                                <span style="color: #fbbf24; font-weight:600;">${r.date_fmt} (tra ${r.days_left} gg)</span>
                            </div>`;
                        }
                    });
                }

                const filtered = (discipline === 'all') 
                    ? window._allUpcomingRaces 
                    : window._allUpcomingRaces.filter(u => u.discipline === discipline);

                if (filtered && filtered.length > 0) {
                    filtered.forEach(u => {
                        const distLabel = u.distances ? ` • ${u.distances}` : '';
                        const locLabel = u.location ? ` [${u.location}]` : '';
                        html += `
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; padding: 0.35rem 0.5rem; background: rgba(255,255,255,0.02); border-radius: 6px; border-left: 2px solid rgba(255,255,255,0.08);">
                            <div>
                                <span>${u.icon || '💡'} <strong>${u.name}</strong></span>
                                <span style="font-size:0.7rem; color:var(--text-muted);">${locLabel}${distLabel}</span>
                            </div>
                            <span style="color: var(--text-muted); font-size:0.74rem; font-weight:600; white-space:nowrap; margin-left:0.5rem;">${u.date_fmt} (${u.days_left} gg)</span>
                        </div>`;
                    });
                } else if (!html) {
                    html = `<div style="text-align:center; padding:0.6rem; font-size:0.75rem; color:var(--text-muted);">Nessun evento in programma per questa disciplina nei prossimi 240 giorni.</div>`;
                }

                upcomingList.innerHTML = html;
            }

            // Initial render
            renderFilteredEvents('all');

            // Wire filter buttons
            const filterBtns = document.querySelectorAll('.race-filter-btn');
            filterBtns.forEach(btn => {
                btn.onclick = () => {
                    filterBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    const disc = btn.getAttribute('data-discipline') || 'all';
                    renderFilteredEvents(disc);
                };
            });

            // Store lifestyle context & update command bar
            window._lastPrep = prep;
            window._lastLifestyleContext = prep.lifestyle_context;
            updateContextCommandBar(prep.lifestyle_context, prep);
        })
        .catch(err => console.error("Error fetching race prep:", err));
}

function loadWorkoutSuggestions() {
    fetch('/api/workout_suggestions')
        .then(res => res.json())
        .then(w => {
            if (!w) return;
            const container = document.getElementById('card-workout-suggestions');
            if (!container) return;
            
            container.innerHTML = `
                <div class="dash-card-header">
                    <span>🎯 Programmazione Allenamento di Oggi</span>
                    <span style="font-size:0.72rem; color:var(--accent-gold);">${w.badge}</span>
                </div>

                <div class="workout-subcard" style="border-left: 3px solid #60a5fa;">
                    <div class="workout-subcard-title">
                        <span>${w.bike_title}</span>
                        <span style="color:#10b981; font-size:0.75rem;">Consigliato</span>
                    </div>
                    <div class="workout-subcard-desc">${w.bike_desc}</div>
                    <div class="workout-subcard-meta">${w.bike_meta}</div>
                </div>

                <div class="workout-subcard" style="border-left: 3px solid #34d399;">
                    <div class="workout-subcard-title">
                        <span>${w.run_title}</span>
                        <span style="color:#38bdf8; font-size:0.75rem;">Opzione Alternativa</span>
                    </div>
                    <div class="workout-subcard-desc">${w.run_desc}</div>
                    ${w.run_ortho_badge ? `
                    <div style="margin: 0.35rem 0; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 6px; padding: 0.25rem 0.5rem; font-size: 0.72rem; color: #38bdf8; font-weight: 700; display: inline-flex; align-items: center; gap: 0.3rem;">
                        <span>🛡️</span>
                        <span>${w.run_ortho_badge}</span>
                    </div>` : ''}
                    <div class="workout-subcard-meta">${w.run_meta}</div>
                </div>

                ${w.hyrox_title ? `
                <div class="workout-subcard" style="border-left: 3px solid #f59e0b; margin-top:8px;">
                    <div class="workout-subcard-title">
                        <span>${w.hyrox_title}</span>
                        <span style="color:#fbbf24; font-size:0.75rem;">Longevità & Forza</span>
                    </div>
                    <div class="workout-subcard-desc">${w.hyrox_desc}</div>
                    <div class="workout-subcard-meta">${w.hyrox_meta}</div>
                </div>` : ''}

                ${w.swim_title ? `
                <div class="workout-subcard" style="border-left: 3px solid #06b6d4; margin-top:8px;">
                    <div class="workout-subcard-title">
                        <span>${w.swim_title}</span>
                        <span style="color:#06b6d4; font-size:0.75rem;">Acqua & Decompressione</span>
                    </div>
                    <div class="workout-subcard-desc">${w.swim_desc}</div>
                    <div class="workout-subcard-meta">${w.swim_meta}</div>
                </div>` : ''}
            `;
        })
        .catch(err => console.error("Error fetching workout suggestions:", err));
}

function triggerManualSync() {
    const btn = document.getElementById('btn-manual-sync');
    const txt = document.getElementById('sync-text');
    if (txt) txt.textContent = "⏳ Sincronizzazione in corso...";
    if (btn) btn.style.opacity = "0.7";

    fetch('/sync')
        .then(res => res.json())
        .then(data => {
            loadData();
            if (txt) txt.textContent = "✅ Dati Aggiornati!";
            if (btn) btn.style.opacity = "1.0";
            setTimeout(() => {
                if (txt) txt.textContent = "🔄 Aggiorna Dati (Strava & Garmin)";
            }, 3500);
        })
        .catch(err => {
            console.error("Error manual sync:", err);
            if (txt) txt.textContent = "❌ Errore Sync";
            if (btn) btn.style.opacity = "1.0";
            setTimeout(() => {
                if (txt) txt.textContent = "🔄 Aggiorna Dati (Strava & Garmin)";
            }, 3500);
        });
}

/* ==========================================================================
   🥗 NUTRITION & DAILY CALORIC BALANCE MODULE
   ========================================================================== */
let currentNutritionDate = null;
let nutritionFoodsLoaded = false;
let cachedFoods = [];

function loadNutritionFoods() {
    if (nutritionFoodsLoaded) return;
    fetch('/api/nutrition/foods')
        .then(res => res.json())
        .then(foods => {
            cachedFoods = Array.isArray(foods) ? foods : [];
            const datalist = document.getElementById('food-datalist');
            if (!datalist) return;
            datalist.innerHTML = '';
            cachedFoods.forEach(f => {
                const opt = document.createElement('option');
                opt.value = f.name;
                const portionInfo = (f.unit && f.unit !== 'porzione (100g)') ? ` [${f.unit}]` : '';
                opt.textContent = `${f.category}${portionInfo} (${f.kcal} kcal/100g • C:${f.carbs}g P:${f.protein}g F:${f.fat}g)`;
                datalist.appendChild(opt);
            });
            nutritionFoodsLoaded = true;
        })
        .catch(err => console.error("Error loading food database:", err));
}

function renderNutritionCard(data) {
    if (!data) return;
    currentNutritionDate = data.date;
    window.currentNutritionData = data;
    if (typeof updateBentoView === "function") updateBentoView();

    const setEl = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    const now = new Date();
    const todayStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const yestStr = `${yest.getDate()}/${yest.getMonth() + 1}/${yest.getFullYear()}`;

    let dateDisplay = data.date;
    const isToday = (data.date === todayStr);
    if (isToday) {
        dateDisplay = `${data.date} (Oggi)`;
    } else if (data.date === yestStr) {
        dateDisplay = `${data.date} (Ieri)`;
    }
    setEl('nutrition-date-label', dateDisplay);

    const btnToday = document.getElementById('btn-nutri-today');
    if (btnToday) {
        btnToday.style.display = isToday ? 'none' : 'inline-block';
    }

    // Status Badge
    const badge = document.getElementById('nutrition-status-badge');
    if (badge) {
        badge.className = 'nutrition-status-badge';
        const stLow = (data.status || 'deficit').toLowerCase();
        badge.classList.add(`status-${stLow}`);
        badge.textContent = data.status_label || `${data.status}: ${data.net_balance} kcal`;
    }

    // Allerta Glicogeno Sotto-Soglia / Finestra FatMax (Miglioria 1)
    const glyAlert = data.glycogen_alert;
    const glyBox = document.getElementById('nutri-glycogen-alert-box');
    if (glyBox) {
        if (glyAlert && glyAlert.active) {
            glyBox.style.display = 'flex';
            const col = glyAlert.badge_color || '#38bdf8';
            glyBox.style.background = col + '18';
            glyBox.style.borderColor = col + '55';
            const tEl = document.getElementById('glycogen-alert-title');
            if (tEl) {
                tEl.textContent = glyAlert.badge || '🔥 FINESTRA FATMAX';
                tEl.style.color = col;
            }
            const bEl = document.getElementById('glycogen-alert-badge');
            if (bEl) {
                bEl.textContent = `-${glyAlert.deficit_g}g Carbo`;
                bEl.style.color = col;
                bEl.style.borderColor = col + '66';
                bEl.style.background = col + '22';
            }
            const txtEl = document.getElementById('glycogen-alert-text');
            if (txtEl) txtEl.innerHTML = glyAlert.message || '';
        } else {
            glyBox.style.display = 'none';
        }
    }

    // Colonna 1: Spesa
    const tdeeEl = document.getElementById('nutri-tdee-val');
    if (tdeeEl) tdeeEl.innerHTML = `${data.tdee.toLocaleString()} <span style="font-size:0.75rem; font-weight:600; opacity:0.8;">kcal</span>`;
    setEl('nutri-bmr-val', `${data.bmr.toLocaleString()} kcal`);
    setEl('nutri-workout-desc', `${data.workout_icon} ${data.workout_desc}`);
    setEl('nutri-workout-val', `+${data.workout_burn} kcal`);
    setEl('nutri-neat-val', `+${data.neat} kcal`);

    // Colonna 2: Introito & Macro con Target
    const intakeEl = document.getElementById('nutri-intake-val');
    if (intakeEl) intakeEl.innerHTML = `${data.intake_kcal.toLocaleString()} <span style="font-size:0.75rem; font-weight:600; opacity:0.8;">kcal</span>`;
    
    // Carboidrati
    const carbsEl = document.getElementById('nutri-carbs-text');
    const carbsDiffTxt = data.carbs_left > 0 ? `mancano ${data.carbs_left}g` : (data.carbs_left < 0 ? `+${Math.abs(data.carbs_left)}g surplus` : 'target raggiunto');
    const carbsTargetLabel = data.target_carbs_g ? ` / ${data.target_carbs_g}g target` : '';
    const carbsPctLabel = data.carbs_target_pct !== undefined ? `${data.carbs_target_pct}%` : `${data.carbs_pct}%`;
    if (carbsEl) carbsEl.innerHTML = `<strong>${data.carbs_g}g</strong>${carbsTargetLabel} <span style="font-size:0.7rem; color:var(--text-muted); font-weight:500;">(${carbsDiffTxt} • ${carbsPctLabel})</span>`;
    const carbsFill = document.getElementById('nutri-carbs-fill');
    if (carbsFill) {
        const carbsBarPct = data.carbs_target_pct !== undefined ? Math.min(100, data.carbs_target_pct) : Math.min(100, data.carbs_pct * 1.6);
        carbsFill.style.width = `${carbsBarPct}%`;
    }

    // Proteine
    const proEl = document.getElementById('nutri-protein-text');
    const proDiffTxt = data.protein_left > 0 ? `mancano ${data.protein_left}g` : (data.protein_left < 0 ? `+${Math.abs(data.protein_left)}g surplus` : 'target raggiunto');
    const proTargetLabel = data.target_protein_g ? ` / ${data.target_protein_g}g target` : '';
    const proPctLabel = data.protein_target_pct !== undefined ? `${data.protein_target_pct}%` : `${data.protein_pct}%`;
    if (proEl) proEl.innerHTML = `<strong>${data.protein_g}g</strong>${proTargetLabel} <span style="font-size:0.7rem; color:var(--text-muted); font-weight:500;">(${proDiffTxt} • ${proPctLabel})</span>`;
    const proFill = document.getElementById('nutri-protein-fill');
    if (proFill) {
        const proBarPct = data.protein_target_pct !== undefined ? Math.min(100, data.protein_target_pct) : Math.min(100, data.protein_pct * 2.5);
        proFill.style.width = `${proBarPct}%`;
    }

    // Grassi
    const fatEl = document.getElementById('nutri-fat-text');
    const fatDiffTxt = data.fat_left > 0 ? `mancano ${data.fat_left}g` : (data.fat_left < 0 ? `+${Math.abs(data.fat_left)}g surplus` : 'target raggiunto');
    const fatTargetLabel = data.target_fat_g ? ` / ${data.target_fat_g}g target` : '';
    const fatPctLabel = data.fat_target_pct !== undefined ? `${data.fat_target_pct}%` : `${data.fat_pct}%`;
    if (fatEl) fatEl.innerHTML = `<strong>${data.fat_g}g</strong>${fatTargetLabel} <span style="font-size:0.7rem; color:var(--text-muted); font-weight:500;">(${fatDiffTxt} • ${fatPctLabel})</span>`;
    const fatFill = document.getElementById('nutri-fat-fill');
    if (fatFill) {
        const fatBarPct = data.fat_target_pct !== undefined ? Math.min(100, data.fat_target_pct) : Math.min(100, data.fat_pct * 2.0);
        fatFill.style.width = `${fatBarPct}%`;
    }

    // Colonna 3: Sudore & Liquidi
    const sweatEl = document.getElementById('nutri-sweat-val');
    if (sweatEl) sweatEl.innerHTML = `${data.sweat_liters} <span style="font-size:0.75rem; font-weight:600; opacity:0.8;">L</span>`;
    setEl('nutri-sweat-sub', `${data.sweat_liters} L (${data.workout_burn > 0 ? 'Sessione Attiva' : 'Riposo'})`);
    setEl('nutri-water-target', `${data.water_target_liters} L / giorno`);
    setEl('nutri-salt-caps', `${data.salt_caps} ${data.salt_caps === 1 ? 'Capsula' : 'Capsule'}`);

    // Items List
    const itemsList = document.getElementById('nutri-items-list');
    setEl('nutri-items-count', `${(data.items || []).length} alimenti`);

    if (itemsList) {
        if (!data.items || data.items.length === 0) {
            itemsList.innerHTML = `<div class="nutri-empty-placeholder">Nessun alimento registrato per oggi. Scrivi ad es. <strong>"1 uovo"</strong> o <strong>"1 cappuccino"</strong> sopra per iniziare a tracciare macro e bilancio calorico.</div>`;
        } else {
            itemsList.innerHTML = '';
            data.items.forEach(it => {
                const row = document.createElement('div');
                row.className = 'nutri-item-row';
                const isOnlyKcal = (it.portion_label === 'Solo kcal' || (!it.grams && !it.carbs && !it.protein && !it.fat));
                const portionText = isOnlyKcal
                    ? '🔥 Solo kcal'
                    : (it.portion_label ? (it.portion_label.includes('g') ? it.portion_label : `${it.portion_label} • ${it.grams}g`) : `${it.grams}g`);
                row.innerHTML = `
                    <div class="nutri-item-info">
                        <span class="nutri-item-name">${it.name}</span>
                        <span class="nutri-item-grams">(${portionText})</span>
                    </div>
                    <div class="nutri-item-macros">
                        <span class="nutri-item-kcal">${it.kcal} kcal</span>
                        <span style="color:#38bdf8;">C:${it.carbs}g</span>
                        <span style="color:#34d399;">P:${it.protein}g</span>
                        <span style="color:#fbbf24;">F:${it.fat}g</span>
                        <button class="nutri-item-del-btn" title="Rimuovi alimento" onclick="deleteNutritionItem('${it.id}')">🗑️</button>
                    </div>
                `;
                itemsList.appendChild(row);
            });
        }
    }

    // Top 10 Cibi Più Usati (1-Click Quick Add)
    const topFoodsBar = document.getElementById('nutri-top-foods-bar');
    if (topFoodsBar && Array.isArray(data.top_foods)) {
        topFoodsBar.innerHTML = `<span style="font-size: 0.68rem; color: var(--text-muted); font-weight: 600; margin-right: 0.2rem;">⭐ Top 10 Più Usati (1-Click):</span>`;
        data.top_foods.forEach(tf => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'race-filter-btn';
            btn.style.fontSize = '0.68rem';
            btn.style.padding = '0.2rem 0.5rem';
            btn.title = `Usato ${tf.count} volte • Clicca per aggiungere subito`;
            btn.textContent = tf.label;
            btn.onclick = () => quickAddFood(tf.name, tf.amount, tf.unit_type);
            topFoodsBar.appendChild(btn);
        });
    }

    // Stima Variazione Peso & Validazione Formula (Wishnofsky ~7.700 kcal = 1 kg)
    const wEst = data.weekly_weight_estimate;
    if (wEst) {
        const net7dEl = document.getElementById('nutri-net-7d-val');
        if (net7dEl) {
            const pNet = wEst.projected_7d_net || 0;
            const sign = pNet > 0 ? '+' : '';
            net7dEl.innerHTML = `${sign}${pNet.toLocaleString()} <span class="nutri-weight-unit">kcal / sett</span>`;
            net7dEl.style.color = wEst.projected_color || '#38bdf8';
        }
        const avgNet = wEst.avg_daily_net || 0;
        const avgSign = avgNet > 0 ? '+' : '';
        setEl('nutri-net-7d-hint', `Media: ${avgSign}${avgNet.toLocaleString()} kcal/gg su ${wEst.tracked_days_count || 0} gg tracciati`);

        const deltaEl = document.getElementById('nutri-weight-delta-val');
        if (deltaEl) {
            deltaEl.innerHTML = `${wEst.projected_delta_str || '0.00 kg/sett'} <span class="nutri-weight-unit"></span>`;
            deltaEl.style.color = wEst.projected_color || '#38bdf8';
        }
        setEl('nutri-weight-delta-hint', wEst.projected_label || 'Stima Variazione Peso');

        setEl('nutri-weight-real-val', `${wEst.current_weight || 85.2} kg`);
        if (wEst.prev_weight) {
            const avgStr = wEst.weighted_avg_weight ? ` • Media Ponderata: ${wEst.weighted_avg_weight} kg` : '';
            setEl('nutri-weight-real-hint', `Precedente: ${wEst.prev_weight} kg (${wEst.prev_weight_date || ''})${avgStr}`);
        } else {
            setEl('nutri-weight-real-hint', 'Peso Baseline di Partenza (Giorno 1)');
        }

        const badgeEl = document.getElementById('nutri-weight-badge');
        const bCol = wEst.validation_badge_color || '#38bdf8';
        if (badgeEl) {
            badgeEl.style.borderColor = bCol + '66';
            badgeEl.style.color = bCol;
            badgeEl.style.background = bCol + '22';
        }
        setEl('nutri-weight-badge-txt', wEst.validation_title || 'IN VALIDAZIONE');

        setEl('nutri-weight-msg-text', wEst.validation_message || '');
        const msgBanner = document.getElementById('nutri-weight-msg-banner');
        if (msgBanner) {
            msgBanner.style.borderColor = bCol + '44';
        }
        const msgIcon = document.getElementById('nutri-weight-msg-icon');
        if (msgIcon) {
            msgIcon.textContent = wEst.validation_status === 'CONCORDANTE' ? '✅' : (wEst.validation_status === 'IN_VALIDAZIONE' ? 'ℹ️' : '⚠️');
        }
    }

    // 🥩 Body Composition (Garmin Index) 6-Card Grid
    const bc = data.body_composition || (wEst && wEst.body_composition);
    if (bc && bc.metrics) {
        const m = bc.metrics;
        const updateBCCard = (prefix, obj) => {
            if (!obj) return;
            const cardEl = document.getElementById(`bc-card-${prefix}`);
            const badgeEl = document.getElementById(`bc-badge-${prefix}`);
            const valEl = document.getElementById(`bc-val-${prefix}`);
            const hintEl = document.getElementById(`bc-hint-${prefix}`);

            const col = obj.color || '#38bdf8';
            if (cardEl) {
                cardEl.style.borderColor = col + '44';
                cardEl.style.background = col + '0a';
            }
            if (badgeEl) {
                badgeEl.textContent = obj.delta_str ? `${obj.delta_str}` : (obj.status || 'OK');
                badgeEl.style.color = col;
                badgeEl.style.background = col + '22';
                badgeEl.style.border = `1px solid ${col}44`;
            }
            if (valEl) {
                valEl.innerHTML = `${obj.val !== null ? obj.val : '--'} <span class="nutri-bodycomp-card-unit">${obj.unit || ''}</span>`;
                valEl.style.color = col;
            }
            if (hintEl) {
                hintEl.textContent = obj.hint || obj.status || '';
            }
        };

        updateBCCard('weight', m.weight);
        updateBCCard('muscle', m.muscle_mass);
        updateBCCard('fat', m.body_fat);
        updateBCCard('water', m.water_pct);
        updateBCCard('bone', m.bone_mass);
        updateBCCard('bmi', m.bmi);

        const bcDateEl = document.getElementById('nutri-bodycomp-date');
        if (bcDateEl) {
            const dateTxt = bc.latest_date || 'Oggi';
            const compTxt = bc.prev_date ? ` (vs ${bc.prev_date}, ${bc.days_between} gg fa)` : '';
            bcDateEl.textContent = `Ultima Rilevazione: ${dateTxt}${compTxt}`;
        }

        // Popola i campi del drawer con gli ultimi dati registrati come default
        const setInp = (id, v) => { const el = document.getElementById(id); if (el && v !== null && v !== undefined) el.value = v; };
        if (m.weight) setInp('nutri-bc-input-weight', m.weight.val);
        if (m.body_fat) setInp('nutri-bc-input-fat', m.body_fat.val);
        if (m.muscle_mass) setInp('nutri-bc-input-muscle', m.muscle_mass.val);
        if (m.water_pct) setInp('nutri-bc-input-water', m.water_pct.val);
        if (m.bone_mass) setInp('nutri-bc-input-bone', m.bone_mass.val);
        if (m.bmi) setInp('nutri-bc-input-bmi', m.bmi.val);
    }

    // 🔬 Analisi Multi-Giorno Carenze & Sbilanciamenti Nutrizionali
    const mAnalysis = data.multi_day_analysis;
    const boxMulti = document.getElementById('box-multi-day-analysis');
    if (boxMulti && mAnalysis) {
        if (mAnalysis.status === 'IN_ATTESA_DATI') {
            boxMulti.style.display = 'none';
        } else {
            boxMulti.style.display = 'flex';
            setEl('multi-period-label', mAnalysis.period_label || 'Monitoraggio Longevità: Sintesi Proteica, Immunità & Glicogeno');
            
            // Overall Status Badge
            const sBadge = document.getElementById('multi-status-badge');
            const sCol = mAnalysis.status_color || '#ef4444';
            if (sBadge) {
                sBadge.style.color = sCol;
                sBadge.style.borderColor = sCol + '66';
                sBadge.style.background = sCol + '22';
            }
            setEl('multi-status-badge-txt', mAnalysis.status_badge || 'ANALISI MULTI-GIORNO');

            // 1. Proteine
            const p = mAnalysis.protein;
            if (p) {
                const pTag = document.getElementById('multi-pro-tag');
                if (pTag) {
                    pTag.style.color = p.color;
                    pTag.style.background = p.color + '22';
                    pTag.textContent = p.badge;
                }
                const pVal = document.getElementById('multi-pro-val');
                if (pVal) {
                    pVal.style.color = p.color;
                    pVal.innerHTML = `${p.avg_g} <span class="nutri-imbalance-unit">g / die (${p.avg_per_kg} g/kg)</span>`;
                }
                const elHint = document.getElementById('multi-pro-hint');
                if (elHint) elHint.innerHTML = `Target Longevità: <strong>${p.target_g}g</strong> (${p.target_per_kg} g/kg • ${p.pct}%)`;
            }

            // 2. Carboidrati
            const c = mAnalysis.carbs;
            if (c) {
                const cTag = document.getElementById('multi-carbs-tag');
                if (cTag) {
                    cTag.style.color = c.color;
                    cTag.style.background = c.color + '22';
                    cTag.textContent = c.badge;
                }
                const cVal = document.getElementById('multi-carbs-val');
                if (cVal) {
                    cVal.style.color = c.color;
                    cVal.innerHTML = `${c.avg_g} <span class="nutri-imbalance-unit">g / die (${c.pct}%)</span>`;
                }
                const cHint = document.getElementById('multi-carbs-hint');
                if (cHint) cHint.textContent = `${c.workout_burn.toLocaleString()} kcal bruciate in ${c.workout_count} sessioni`;
            }

            // 3. Grassi
            const f = mAnalysis.fat;
            if (f) {
                const fTag = document.getElementById('multi-fat-tag');
                if (fTag) {
                    fTag.style.color = f.color;
                    fTag.style.background = f.color + '22';
                    fTag.textContent = f.badge;
                }
                const fVal = document.getElementById('multi-fat-val');
                if (fVal) {
                    fVal.style.color = f.color;
                    fVal.innerHTML = `${f.avg_g} <span class="nutri-imbalance-unit">g / die (${f.avg_per_kg} g/kg)</span>`;
                }
                const fHint = document.getElementById('multi-fat-hint');
                if (fHint) fHint.innerHTML = `Target Ormonale: <strong>${f.target_g}g</strong> (${f.target_per_kg} g/kg • ${f.pct}%)`;
            }

            // 4. Bilancio Energetico
            const e = mAnalysis.energy;
            if (e) {
                const eTag = document.getElementById('multi-energy-tag');
                if (eTag) {
                    eTag.style.color = e.color;
                    eTag.style.background = e.color + '22';
                    eTag.textContent = e.badge;
                }
                const eVal = document.getElementById('multi-energy-val');
                if (eVal) {
                    eVal.style.color = e.color;
                    const sign = e.total_deficit > 0 ? '+' : '';
                    eVal.innerHTML = `${sign}${e.total_deficit.toLocaleString()} <span class="nutri-imbalance-unit">kcal (7d)</span>`;
                }
                const eHint = document.getElementById('multi-energy-hint');
                if (eHint) eHint.textContent = e.hint || `Media: ${e.avg_daily_deficit} kcal/die`;
            }

            // Box Clinical Insight & Prescription
            const elInsight = document.getElementById('multi-clinical-insight');
            if (elInsight) elInsight.textContent = mAnalysis.clinical_insight || '';

            const elPresc = document.getElementById('multi-prescription');
            if (elPresc) elPresc.innerHTML = mAnalysis.prescription || '';
        }
    }
}

function loadNutritionData(dateStr) {
    const url = dateStr ? `/api/nutrition?date=${encodeURIComponent(dateStr)}` : '/api/nutrition';
    fetch(url)
        .then(res => res.json())
        .then(data => renderNutritionCard(data))
        .catch(err => console.error("Error loading nutrition data:", err));
}

function shiftNutritionDate(daysDelta) {
    let baseDate = new Date();
    if (currentNutritionDate) {
        const parts = currentNutritionDate.split('/');
        if (parts.length === 3) {
            baseDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        }
    }
    baseDate.setDate(baseDate.getDate() + daysDelta);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (baseDate > today) {
        baseDate = new Date();
    }
    const targetStr = `${baseDate.getDate()}/${baseDate.getMonth() + 1}/${baseDate.getFullYear()}`;
    loadNutritionData(targetStr);
}

function toggleBodyCompDrawer() {
    const drawer = document.getElementById('nutri-bodycomp-drawer');
    if (drawer) {
        drawer.classList.toggle('open');
    }
}

function logFullBodyComposition() {
    const getNum = id => {
        const el = document.getElementById(id);
        if (!el || !el.value) return null;
        const v = parseFloat(el.value.replace(',', '.'));
        return isNaN(v) ? null : v;
    };

    const weightVal = getNum('nutri-bc-input-weight') || getNum('nutri-weight-input');
    if (!weightVal || weightVal < 40 || weightVal > 150) {
        alert("Inserisci un valore di peso valido in kg (es. 84.9)");
        const el = document.getElementById('nutri-bc-input-weight');
        if (el) el.focus();
        return;
    }

    const payload = {
        date: currentNutritionDate || null,
        weight: weightVal,
        body_fat_pct: getNum('nutri-bc-input-fat'),
        muscle_kg: getNum('nutri-bc-input-muscle'),
        water_pct: getNum('nutri-bc-input-water'),
        bone_kg: getNum('nutri-bc-input-bone'),
        bmi: getNum('nutri-bc-input-bmi')
    };

    fetch('/api/nutrition/weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        renderNutritionCard(data);
        const drawer = document.getElementById('nutri-bodycomp-drawer');
        if (drawer) drawer.classList.remove('open');
        showClinicalToast("Dati Composizione Corporea salvati su CSV!");
    })
    .catch(err => {
        console.error("Error logging body composition:", err);
        alert("Errore salvataggio composizione: " + err);
    });
}

function logCurrentWeight() {
    const input = document.getElementById('nutri-weight-input');
    if (!input || !input.value) {
        alert("Inserisci un valore di peso valido in kg (es. 84.9)");
        if (input) input.focus();
        return;
    }
    const weightVal = parseFloat(input.value.replace(',', '.'));
    if (isNaN(weightVal) || weightVal < 40 || weightVal > 150) {
        alert("Inserisci un peso valido compreso tra 40 e 150 kg.");
        return;
    }

    const payload = {
        date: currentNutritionDate || null,
        weight: weightVal
    };

    fetch('/api/nutrition/weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        renderNutritionCard(data);
        input.value = '';
        showClinicalToast("Peso salvato su CSV!");
    })
    .catch(err => {
        console.error("Error logging weight:", err);
        alert("Errore durante il salvataggio del peso: " + err);
    });
}

function addNutritionItem() {
    const foodInput = document.getElementById('nutri-food-input');
    const gramsInput = document.getElementById('nutri-grams-input');
    const unitSelect = document.getElementById('nutri-unit-select');

    let rawName = foodInput ? foodInput.value.trim() : '';
    const hasGramsVal = gramsInput && gramsInput.value && parseFloat(gramsInput.value) > 0;
    let unitType = unitSelect ? unitSelect.value : 'auto';

    // Se l'utente non ha scritto il nome ma ha messo le calorie nella casella quantità, accetta come Calorie Libere
    if (!rawName && hasGramsVal) {
        rawName = 'Calorie Libere / Pasto Stimato';
        unitType = 'kcal';
    } else if (!rawName) {
        if (foodInput) foodInput.focus();
        return;
    }

    let amount = hasGramsVal ? parseFloat(gramsInput.value) : 1;

    if (isNaN(amount) || amount <= 0) {
        amount = 1;
    }

    const btn = document.getElementById('nutri-btn-add');
    if (btn) btn.disabled = true;

    fetch('/api/nutrition/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            date: currentNutritionDate,
            name: rawName,
            amount: amount,
            unit_type: unitType
        })
    })
    .then(res => res.json())
    .then(data => {
        renderNutritionCard(data);
        if (foodInput) foodInput.value = '';
        if (gramsInput) gramsInput.value = '';
        if (unitSelect) unitSelect.value = 'auto';
        if (gramsInput) gramsInput.placeholder = 'Quantità';
        if (foodInput) foodInput.focus();
    })
    .catch(err => console.error("Error adding food item:", err))
    .finally(() => {
        if (btn) btn.disabled = false;
    });
}

function quickAddFood(name, amount, unitType) {
    fetch('/api/nutrition/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            date: currentNutritionDate,
            name: name,
            amount: amount,
            unit_type: unitType || 'auto'
        })
    })
    .then(res => res.json())
    .then(data => renderNutritionCard(data))
    .catch(err => console.error("Error quick adding food:", err));
}

function deleteNutritionItem(itemId) {
    if (!itemId) return;
    fetch('/api/nutrition/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            date: currentNutritionDate,
            id: itemId
        })
    })
    .then(res => res.json())
    .then(data => renderNutritionCard(data))
    .catch(err => console.error("Error deleting food item:", err));
}

function setupNutritionInputs() {
    loadNutritionFoods();
    const foodInput = document.getElementById('nutri-food-input');
    const gramsInput = document.getElementById('nutri-grams-input');
    const unitSelect = document.getElementById('nutri-unit-select');

    if (foodInput && !foodInput.dataset.bound) {
        foodInput.dataset.bound = "true";
        
        // Smart automatic unit switching when typing or picking food
        foodInput.addEventListener('input', () => {
            const val = foodInput.value.trim().toLowerCase();
            if (!val) return;
            // Se contiene kcal / cal, imposta unitSelect a 'kcal'
            if (/\b(kcal|cal|kal|calorie)\b/i.test(val) || /^\d+$/.test(val)) {
                if (unitSelect) unitSelect.value = 'kcal';
                if (gramsInput) gramsInput.placeholder = 'Solo kcal';
                return;
            }
            // Cerca match in cachedFoods
            const match = cachedFoods.find(f => 
                f.name.toLowerCase() === val || 
                (f.aliases && f.aliases.some(a => a.toLowerCase() === val || val.includes(a.toLowerCase())))
            );
            if (match) {
                if (match.unit && match.unit !== 'porzione (100g)') {
                    if (unitSelect) unitSelect.value = 'piece';
                    if (gramsInput && !gramsInput.value) gramsInput.value = '1';
                    if (gramsInput) gramsInput.placeholder = `1 = ${match.unit}`;
                } else {
                    if (unitSelect) unitSelect.value = 'grams';
                    if (gramsInput && (!gramsInput.value || gramsInput.value === '1')) gramsInput.value = '';
                    if (gramsInput) gramsInput.placeholder = 'Grammi (es. 100)';
                }
            }
        });

        foodInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') {
                if (gramsInput && !gramsInput.value && !/\d/.test(foodInput.value)) {
                    gramsInput.focus();
                } else {
                    addNutritionItem();
                }
            }
        });
    }

    if (gramsInput && !gramsInput.dataset.bound) {
        gramsInput.dataset.bound = "true";
        gramsInput.addEventListener('input', () => {
            const v = parseFloat(gramsInput.value);
            if (!isNaN(v) && unitSelect) {
                // Se l'utente ha scelto esplicitamente 'kcal' o il campo alimento è vuoto, mantieni 'kcal'
                if (unitSelect.value === 'kcal') return;
                if (foodInput && !foodInput.value.trim()) {
                    unitSelect.value = 'kcal';
                    return;
                }
                // Se l'utente digita >= 15 (es. 30, 50, 100, 150) passa in automatico a Grammi (g)
                if (v >= 15) {
                    unitSelect.value = 'grams';
                } else if (v > 0 && v < 15) {
                    unitSelect.value = 'piece';
                }
            }
        });
        gramsInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') addNutritionItem();
        });
    }

    if (unitSelect && !unitSelect.dataset.bound) {
        unitSelect.dataset.bound = "true";
        unitSelect.addEventListener('change', () => {
            if (unitSelect.value === 'piece') {
                if (gramsInput && !gramsInput.value) gramsInput.value = '1';
                if (gramsInput) gramsInput.placeholder = 'Es. 1 o 2';
            } else if (unitSelect.value === 'grams') {
                if (gramsInput && gramsInput.value === '1') gramsInput.value = '100';
                if (gramsInput) gramsInput.placeholder = 'Grammi (es. 100)';
            } else if (unitSelect.value === 'kcal') {
                if (gramsInput && gramsInput.value === '1') gramsInput.value = '';
                if (gramsInput) gramsInput.placeholder = 'Kcal (es. 600)';
            }
        });
    }

    const weightInput = document.getElementById('nutri-weight-input');
    if (weightInput && !weightInput.dataset.bound) {
        weightInput.dataset.bound = "true";
        weightInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') logCurrentWeight();
        });
    }
}

function loadData() {
    fetch('/data')
        .then(res => res.json())
        .then(resData => {
            const dataArray = Array.isArray(resData) ? resData : (resData.data || []);
            renderDashboard(dataArray);
        })
        .catch(err => console.error("Error fetching v2 data:", err));
    
    loadRacePrep();
    loadWorkoutSuggestions();
    loadNutritionData();
    setupNutritionInputs();
    loadClinicalHealthData();
    loadTrainingZones();
    loadLoadDistribution();
    if (typeof initViewMode === "function") initViewMode();
}

let clinicalHealthData = null;

function loadClinicalHealthData() {
    fetch('/api/health')
        .then(res => res.json())
        .then(data => {
            if (!data || data.error) return;
            clinicalHealthData = data;
            renderClinicalHealth(data);
        })
        .catch(err => console.error("Error fetching clinical health data:", err));
}

function renderClinicalHealth(data) {
    if (!data) return;
    const cgm = data.cgm || {};
    const routine = data.routine_categories || [];
    const prevGroups = data.prevention_cancer_exams || [];

    const tirEl = document.getElementById('cgm-tir');
    if (tirEl && cgm.time_in_range_pct) tirEl.textContent = `${cgm.time_in_range_pct}%`;
    const cvEl = document.getElementById('cgm-cv');
    if (cvEl && cgm.cv_variability_pct) cvEl.textContent = `${cgm.cv_variability_pct}%`;
    const meanEl = document.getElementById('cgm-mean');
    if (meanEl && cgm.avg_glucose_mgdl) meanEl.textContent = `${Math.round(cgm.avg_glucose_mgdl)} mg/dL`;

    // 1. Routine Pillars List
    const routineList = document.getElementById('routine-pillars-list');
    if (routineList && routine.length > 0) {
        routineList.innerHTML = routine.map(pillar => {
            const bCol = pillar.badge_color || '#10b981';
            const stLbl = (pillar.status || 'DA COMPLETARE').replace(/_/g, ' ');
            const examsRows = (pillar.exams || []).map(ex => {
                const stTagCls = ex.status === 'VALIDATO' ? 'validato' : 'da-fare';
                return `<div class="routine-exam-row">
                    <span class="exam-name">${ex.name || ''}</span>
                    <span class="exam-target">Target: ${ex.target || ''}</span>
                    <span class="exam-status-tag ${stTagCls}">${ex.status || ''}</span>
                    <span class="exam-desc">${ex.desc || ''}</span>
                </div>`;
            }).join('');

            return `<div class="routine-pillar-box">
                <div class="routine-pillar-header">
                    <div>
                        <span class="routine-pillar-title">${pillar.icon || '📋'} ${pillar.name || ''}</span>
                        <span class="routine-pillar-lead">${pillar.lead || ''} • ${pillar.covered_summary || ''}</span>
                    </div>
                    <span class="routine-pillar-badge" style="background:${bCol}22; color:${bCol}; border:1px solid ${bCol}55;">${stLbl}</span>
                </div>
                <div class="routine-exams-table">
                    ${examsRows}
                </div>
            </div>`;
        }).join('');
    }

    // 2. Prevention & Cancer Screening Groups
    const prevList = document.getElementById('prevention-groups-list');
    if (prevList && prevGroups.length > 0) {
        prevList.innerHTML = prevGroups.map(group => {
            const pCol = group.priority_color || '#ef4444';
            const cards = (group.items || []).map(itm => {
                return `<div class="prev-card">
                    <div class="prev-card-top">
                        <div>
                            <div class="prev-card-title">${itm.title || ''}</div>
                            <div class="prev-card-meta">${itm.category || ''} • Ref: ${itm.doctor || ''}</div>
                        </div>
                        <span class="prev-freq-tag">${itm.frequency || ''}</span>
                    </div>
                    <div class="prev-reason-box">
                        <strong>Perché per Simone:</strong> ${itm.lifestyle_reason || ''}
                    </div>
                    <div class="prev-action-box">
                        👉 <strong>Azione:</strong> ${itm.action || ''}
                    </div>
                </div>`;
            }).join('');

            return `<div class="prevention-priority-group">
                <div class="prev-group-header">
                    <span class="prev-group-title" style="color:{pCol};">${group.priority_label || ''}</span>
                    <span class="prev-group-tag" style="background:${pCol}22; color:${pCol}; border:1px solid ${pCol}55;">${group.tag || ''}</span>
                </div>
                <div class="prev-cards-grid">
                    ${cards}
                </div>
            </div>`;
        }).join('');
    }
}

function switchClinicalTab(tabName) {
    const btnRoutine = document.getElementById('tab-btn-routine');
    const btnPrevention = document.getElementById('tab-btn-prevention');
    const panelRoutine = document.getElementById('panel-clinical-routine');
    const panelPrevention = document.getElementById('panel-clinical-prevention');

    if (tabName === 'routine') {
        if (btnRoutine) btnRoutine.classList.add('active');
        if (btnPrevention) btnPrevention.classList.remove('active');
        if (panelRoutine) panelRoutine.classList.add('active');
        if (panelPrevention) panelPrevention.classList.remove('active');
    } else {
        if (btnRoutine) btnRoutine.classList.remove('active');
        if (btnPrevention) btnPrevention.classList.add('active');
        if (panelRoutine) panelRoutine.classList.remove('active');
        if (panelPrevention) panelPrevention.classList.add('active');
    }
}

function showClinicalToast(msg) {
    const toast = document.getElementById('clinical-toast');
    if (!toast) return;
    toast.textContent = msg || '✅ Elenco esami copiato negli appunti!';
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3200);
}

function toggleClinicalSection(e) {
    if (e) {
        if (e.target && e.target.closest('#btn-copy-rx')) return;
    }
    const content = document.getElementById('clinical-collapsible-content');
    const btn = document.getElementById('btn-toggle-clinical');
    const header = document.querySelector('.clinical-main-header');
    if (!content) return;

    const isOpen = content.classList.contains('open');
    if (isOpen) {
        content.classList.remove('open');
        if (btn) {
            btn.innerHTML = '🔽 Mostra Esami e Protocolli';
            btn.classList.remove('open');
        }
        if (header) header.classList.remove('open');
    } else {
        content.classList.add('open');
        if (btn) {
            btn.innerHTML = '🔼 Comprimi Sezione Clinica';
            btn.classList.add('open');
        }
        if (header) header.classList.add('open');
    }
}

function copyDoctorPrescription(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const rxText = (clinicalHealthData && clinicalHealthData.prescription_text) ? clinicalHealthData.prescription_text : '';
    if (!rxText) return;

    const btn = document.getElementById('btn-copy-rx');
    const originalText = btn ? btn.innerHTML : '📋 Copia per il Medico';

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(rxText).then(() => {
            if (btn) {
                btn.innerHTML = '✅ Copiato!';
                btn.style.borderColor = '#10b981';
                btn.style.color = '#10b981';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.borderColor = '';
                    btn.style.color = '';
                }, 3000);
            }
            showClinicalToast('✅ Elenco completo esami copiato negli appunti!');
        }).catch(() => {
            fallbackCopyText(rxText, btn, originalText);
        });
    } else {
        fallbackCopyText(rxText, btn, originalText);
    }
}

function fallbackCopyText(text, btn, originalText) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy');
        if (btn) {
            btn.innerHTML = '✅ Copiato negli Appunti!';
            btn.style.borderColor = '#10b981';
            btn.style.color = '#10b981';
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.borderColor = '';
                btn.style.color = '';
            }, 3000);
        }
        showClinicalToast('✅ Elenco completo esami copiato negli appunti!');
    } catch (e) {
        alert("Impossibile copiare automaticamente. Seleziona e copia il testo.");
    }
    document.body.removeChild(ta);
}

// ==========================================================================
// 🎯 Training Zones Collapsible Card (Garmin Setup via Rolling DFA alpha1)
// ==========================================================================
let trainingZonesData = null;

function loadTrainingZones() {
    fetch('/api/training_zones')
        .then(res => res.json())
        .then(data => {
            if (!data || data.error) return;
            trainingZonesData = data;
            renderTrainingZones(data);
        })
        .catch(err => console.error("Error fetching training zones data:", err));
}

function renderTrainingZones(data) {
    if (!data) return;
    const meta = data.meta || {};
    const bike = data.bike || {};
    const run = data.run || {};

    const badge = document.getElementById('zones-rolling-badge');
    if (badge && bike.lt1_hr_rolling) {
        badge.textContent = `LT1 DFA α1: ${bike.lt1_hr_rolling} bpm • ${bike.lt1_watt_rolling || 225} W (Salita fino a ${bike.lt1_watt_climb || 240} W)`;
    }

    // Render Decoupling Box (TSS vs hrTSS termoregolato)
    const decBox = document.getElementById('zones-decoupling-box');
    const dec = data.decoupling;
    if (decBox && dec && dec.has_data) {
        decBox.style.display = 'flex';
        const decBadge = document.getElementById('zones-decoupling-badge');
        if (decBadge) {
            decBadge.textContent = dec.badge_label;
            decBadge.style.color = dec.badge_color;
            decBadge.style.borderColor = `${dec.badge_color}66`;
            decBadge.style.background = `${dec.badge_color}18`;
        }
        const elTss = document.getElementById('dec-val-tss');
        if (elTss) elTss.textContent = `${dec.tss} TSS`;
        const elHrtss = document.getElementById('dec-val-hrtss');
        if (elHrtss) elHrtss.textContent = `${dec.hrtss} hrTSS`;
        const elHrtssTerm = document.getElementById('dec-val-hrtss-term');
        if (elHrtssTerm) elHrtssTerm.textContent = `${dec.hrtss_term} hrTSS (${dec.temp}°C)`;
        const elDelta = document.getElementById('dec-val-delta');
        if (elDelta) {
            elDelta.textContent = dec.delta_str;
            elDelta.style.color = dec.badge_color;
        }
        const elPahrBox = document.getElementById('dec-metric-pahr-box');
        const elPahr = document.getElementById('dec-val-pahr');
        if (dec.pa_hr && elPahr) {
            elPahr.textContent = dec.pa_hr;
            if (elPahrBox) elPahrBox.style.display = 'flex';
        } else if (elPahrBox) {
            elPahrBox.style.display = 'none';
        }
        const elTarget = document.getElementById('dec-target-summary');
        if (elTarget) elTarget.textContent = `${dec.target_z2_watts} • FC ${dec.target_z2_hr}`;
        const elRec = document.getElementById('dec-recommendation-text');
        if (elRec) elRec.textContent = dec.recommendation;
    } else if (decBox) {
        decBox.style.display = 'none';
    }

    // Render Bike Zones
    const bikeGrid = document.getElementById('zones-bike-grid');
    if (bikeGrid && bike.zones) {
        bikeGrid.innerHTML = bike.zones.map(z => `
            <div class="zone-card-item" style="--zone-border: ${z.color};">
                <div class="zone-item-header">
                    <span class="zone-name">${z.name}</span>
                    <span class="zone-tag" style="color: ${z.color}; border: 1px solid ${z.color}55;">${z.id} • ${z.pct_ftp}</span>
                </div>
                <div class="zone-metrics-row">
                    <div class="zone-metric-col">
                        <span class="zone-metric-lbl">Potenza (Watt)</span>
                        <span class="zone-metric-val" style="color: ${z.color};">${z.watts_str}</span>
                    </div>
                    <div class="zone-metric-col">
                        <span class="zone-metric-lbl">Freq. Cardiaca</span>
                        <span class="zone-metric-val">${z.hr_str}</span>
                    </div>
                </div>
                <div class="zone-desc">${z.desc}</div>
            </div>
        `).join('');
    }

    // Render Run Zones
    const runGrid = document.getElementById('zones-run-grid');
    if (runGrid && run.zones) {
        runGrid.innerHTML = run.zones.map(z => `
            <div class="zone-card-item" style="--zone-border: ${z.color};">
                <div class="zone-item-header">
                    <span class="zone-name">${z.name}</span>
                    <span class="zone-tag" style="color: ${z.color}; border: 1px solid ${z.color}55;">${z.id}</span>
                </div>
                <div class="zone-metrics-row">
                    <div class="zone-metric-col">
                        <span class="zone-metric-lbl">Passo Reale</span>
                        <span class="zone-metric-val" style="color: ${z.color};">${z.pace_str}</span>
                    </div>
                    <div class="zone-metric-col">
                        <span class="zone-metric-lbl">Freq. Cardiaca</span>
                        <span class="zone-metric-val">${z.hr_str}</span>
                    </div>
                </div>
                <div class="zone-desc">${z.desc}</div>
            </div>
        `).join('');
    }
}

function toggleTrainingZones(e) {
    if (e && e.target && e.target.closest('#btn-copy-zones')) return;
    const content = document.getElementById('zones-collapsible-content');
    const btn = document.getElementById('btn-toggle-zones');
    const header = document.getElementById('zones-main-header');
    if (!content) return;

    const isHidden = (content.style.display === 'none' || !content.style.display);
    if (isHidden) {
        content.style.display = 'flex';
        if (btn) btn.innerHTML = '🔼 Comprimi Zone';
        if (header) header.classList.add('open');
    } else {
        content.style.display = 'none';
        if (btn) btn.innerHTML = '🔽 Mostra Zone';
        if (header) header.classList.remove('open');
    }
}

function switchZonesTab(tab) {
    const tabBike = document.getElementById('tab-zones-bike');
    const tabRun = document.getElementById('tab-zones-run');
    const contentBike = document.getElementById('zones-tab-content-bike');
    const contentRun = document.getElementById('zones-tab-content-run');

    if (tab === 'bike') {
        if (tabBike) tabBike.classList.add('active');
        if (tabRun) tabRun.classList.remove('active');
        if (contentBike) contentBike.style.display = 'block';
        if (contentRun) contentRun.style.display = 'none';
    } else {
        if (tabRun) tabRun.classList.add('active');
        if (tabBike) tabBike.classList.remove('active');
        if (contentRun) contentRun.style.display = 'block';
        if (contentBike) contentBike.style.display = 'none';
    }
}

function copyGarminZones(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const gText = (trainingZonesData && trainingZonesData.meta && trainingZonesData.meta.garmin_text) 
        ? trainingZonesData.meta.garmin_text 
        : '';
    if (!gText) return;

    const btn = document.getElementById('btn-copy-zones');
    const originalText = btn ? btn.innerHTML : '📋 Copia per Garmin Connect';

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(gText).then(() => {
            if (btn) {
                btn.innerHTML = '✅ Copiato!';
                btn.style.borderColor = '#10b981';
                btn.style.color = '#10b981';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.borderColor = '';
                    btn.style.color = '';
                }, 3000);
            }
            showClinicalToast('✅ Setup Zone copiato negli appunti per Garmin Connect!');
        }).catch(() => {
            fallbackCopyText(gText, btn, originalText);
        });
    } else {
        fallbackCopyText(gText, btn, originalText);
    }
}

function loadLoadDistribution() {
    fetch('/api/load_distribution')
        .then(res => res.json())
        .then(data => {
            if (!data || data.error) return;
            renderLoadDistribution(data);
        })
        .catch(err => console.error("Error fetching load distribution:", err));
}

function renderLoadDistribution(data) {
    if (!data) return;
    const ui = data.ui_strings || {};
    const p7 = data.period_7d || {};
    const fb = data.feedback || {};

    const elUnderLt1Badge = document.getElementById('dist-under-lt1-badge');
    if (elUnderLt1Badge && ui.under_lt1_str) elUnderLt1Badge.textContent = ui.under_lt1_str;

    const elZ3Badge = document.getElementById('dist-z3-badge');
    if (elZ3Badge && ui.z3_badge_str) elZ3Badge.textContent = ui.z3_badge_str;

    const elZ4z5Badge = document.getElementById('dist-z4z5-badge');
    if (elZ4z5Badge && ui.z4z5_badge_str) elZ4z5Badge.textContent = ui.z4z5_badge_str;

    const elZ2Text = document.getElementById('dist-z2-text');
    const elZ2Bar = document.getElementById('dist-z2-bar');
    if (elZ2Text && ui.z2_label) elZ2Text.textContent = ui.z2_label;
    if (elZ2Bar && p7.z2_pct != null) elZ2Bar.style.width = `${p7.z2_pct}%`;

    const elZ1Text = document.getElementById('dist-z1-text');
    const elZ1Bar = document.getElementById('dist-z1-bar');
    if (elZ1Text && ui.z1_label) elZ1Text.textContent = ui.z1_label;
    if (elZ1Bar && p7.z1_pct != null) elZ1Bar.style.width = `${p7.z1_pct}%`;

    const elZ3Text = document.getElementById('dist-z3-text');
    const elZ3Bar = document.getElementById('dist-z3-bar');
    if (elZ3Text && ui.z3_label) elZ3Text.textContent = ui.z3_label;
    if (elZ3Bar && p7.z3_pct != null) elZ3Bar.style.width = `${p7.z3_pct}%`;

    const elZ4z5Text = document.getElementById('dist-z4z5-text');
    const elZ4z5Bar = document.getElementById('dist-z4z5-bar');
    if (elZ4z5Text && ui.z4z5_label) elZ4z5Text.textContent = ui.z4z5_label;
    if (elZ4z5Bar && p7.z4z5_pct != null) elZ4z5Bar.style.width = `${p7.z4z5_pct}%`;

    const elBadge = document.getElementById('dist-target-badge');
    if (elBadge && fb.badge_text) {
        elBadge.textContent = fb.badge_text;
        elBadge.style.color = fb.badge_color || '#10b981';
    }

    const elFeedback = document.getElementById('dist-feedback-text');
    if (elFeedback && fb.text) {
        elFeedback.innerHTML = fb.text;
    }
}

function logOliveHarvest(hours, extraKcal, tss) {
    const dStr = currentNutritionDate || 'oggi';
    if (!confirm(`Vuoi registrare ${hours} ore di Raccolta Olive per ${dStr} (+${extraKcal} kcal al TDEE)?`)) {
        return;
    }
    const note = `🫒 Lavoro Funzionale: Raccolta Olive (${hours}h • +${extraKcal} kcal NEAT, ${tss} TSS funzionale)`;
    fetch('/api/nutrition/functional_work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            date: currentNutritionDate || null,
            hours: hours,
            extra_kcal: extraKcal,
            tss: tss,
            work_type: 'olive_harvest',
            note: note
        })
    })
    .then(res => res.json())
    .then(updatedData => {
        renderNutritionCard(updatedData);
        if (typeof loadData === 'function') loadData();
    })
    .catch(err => {
        console.error('Errore registrazione lavoro olive:', err);
        alert('Errore nel salvataggio del lavoro funzionale.');
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadData);
} else {
    loadData();
}




/* ==========================================================================
   📱 BENTO MOBILE VIEW LOGIC (0xCal / iOS Inspired)
   ========================================================================== */

let currentViewMode = 'desktop';

// ==========================================================================
// 📱 ATHLETE PRO BENTO MOBILE VIEW CONTROLLER (Longevity Athlete OS)
// ==========================================================================

function toggleDashboardView(mode) {
    const isBento = (mode === 'bento') || (!mode && !document.body.classList.contains('mode-bento'));
    const btnText = document.getElementById('btn-toggle-view-text');

    if (isBento) {
        document.body.classList.add('mode-bento');
        document.body.classList.remove('mode-desktop');
        if (btnText) btnText.textContent = '💻 Vista Desktop';
        localStorage.setItem('longevity_view_mode', 'bento');
        updateBentoView();
    } else {
        document.body.classList.remove('mode-bento');
        document.body.classList.add('mode-desktop');
        if (btnText) btnText.textContent = '📱 Bento Mobile';
        localStorage.setItem('longevity_view_mode', 'desktop');
    }
}

function initViewMode() {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view') || params.get('mode');
    if (view === 'bento') {
        toggleDashboardView('bento');
        return;
    }
    if (view === 'desktop') {
        toggleDashboardView('desktop');
        return;
    }

    const saved = localStorage.getItem('longevity_view_mode');
    const isMobile = window.innerWidth <= 768;
    if (saved === 'bento' || (!saved && isMobile)) {
        toggleDashboardView('bento');
    } else {
        toggleDashboardView('desktop');
    }
}

function switchBentoTab(tab, event) {
    if (event) {
        document.querySelectorAll('.bento-floating-dock .dock-item').forEach(b => b.classList.remove('active'));
        const btn = event.currentTarget || event.target.closest('.dock-item');
        if (btn) btn.classList.add('active');
    }

    const secMap = {
        'today': 'bento-sec-today',
        'load': 'bento-sec-load',
        'health': 'bento-sec-health',
        'zones': 'bento-sec-zones',
        'nutrition': 'bento-sec-nutrition'
    };

    const targetId = secMap[tab];
    if (targetId) {
        const el = document.getElementById(targetId);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}

function updateBentoView() {
    const dashList = window.lastDataArray;
    if (!dashList || dashList.length === 0) return;
    const last = dashList[dashList.length - 1];
    const nutri = window.currentNutritionData;

    // 0. TOP CONTEXT PILL (DATE & LOCATION)
    const contextPill = document.querySelector('.bento-context-pill span:last-child');
    if (contextPill && last) {
        const dDay = last['day'];
        const dMonth = last['month'];
        const dYear = last['year'];
        if (dDay && dMonth && dYear) {
            const today = new Date();
            const isToday = parseInt(dDay) === today.getDate() && parseInt(dMonth) === (today.getMonth() + 1) && parseInt(dYear) === today.getFullYear();
            const dateStr = isToday ? `${dDay}/${dMonth}/${dYear} (OGGI)` : `${dDay}/${dMonth}/${dYear}`;
            contextPill.innerHTML = `📍 Lido di Camaiore • 📅 <strong>${dateStr}</strong> • 🍁 Fase 1`;
        }
    }

    // 1. CARICO & TRAINING (CTL, ATL, TSB, ACWR, Dicotomia Bici/Corsa)
    const ctl = parseFloat(last['CTL'] || 0);
    const atl = parseFloat(last['ATL'] || (ctl - (parseFloat(last['TSB'] || 0))));
    const tsb = parseFloat(last['TSB'] || 0);
    const bikeCtl = parseFloat(last['bike_ctl'] || last['ctl_bike'] || last['Bike CTL'] || 23.7);
    const runCtl = parseFloat(last['run_ctl'] || last['ctl_run'] || last['Run CTL'] || 9.5);
    const bikeAtl = parseFloat(last['bike_atl'] || last['atl_bike'] || last['Bike ATL'] || 0);
    const acwr = (ctl > 0) ? (atl / ctl) : 1.0;

    const ctlEl = document.getElementById('bento-ctl-val');
    if (ctlEl) ctlEl.textContent = ctl.toFixed(1);

    const atlEl = document.getElementById('bento-atl-val');
    if (atlEl) atlEl.textContent = atl.toFixed(1);

    const tsbEl = document.getElementById('bento-tsb-val');
    if (tsbEl) {
        tsbEl.textContent = `${tsb >= 0 ? '+' : ''}${tsb.toFixed(1)}`;
        tsbEl.style.color = (tsb >= 5) ? '#38bdf8' : (tsb >= -15 ? '#10b981' : '#f59e0b');
    }

    const tsbStatusEl = document.getElementById('bento-tsb-status');
    if (tsbStatusEl) {
        tsbStatusEl.textContent = (tsb >= 8) ? 'Freschezza' : (tsb >= 0 ? 'Ricarica' : 'Fatica');
    }

    const acwrBadge = document.getElementById('bento-acwr-badge');
    if (acwrBadge) {
        const acwrCol = (acwr > 1.5) ? '#ef4444' : (acwr >= 0.8 && acwr <= 1.3 ? '#10b981' : '#f59e0b');
        acwrBadge.textContent = `🛡️ ACWR ${acwr.toFixed(2)} (${acwr <= 1.3 ? 'Ottimale' : 'Attenzione'})`;
        acwrBadge.style.color = acwrCol;
        acwrBadge.style.borderColor = acwrCol + '55';
        acwrBadge.style.background = acwrCol + '18';
    }

    const bCtlEl = document.getElementById('bento-bike-ctl');
    if (bCtlEl) bCtlEl.textContent = bikeCtl.toFixed(1);

    const rCtlEl = document.getElementById('bento-run-ctl');
    if (rCtlEl) rCtlEl.textContent = runCtl.toFixed(1);

    // 2. BIOMETRICHE (HRV, RHR, SONNO)
    const hrv = parseFloat(last['night HRV'] || 0);
    const rhr = parseFloat(last['RHR'] || 0);
    const sleepHours = parseFloat(last['ore sonno'] || last['ore_sonno'] || last['Sleep duration'] || last['Sonno'] || 0);
    const sleepScore = parseFloat(last['sleep score'] || last['sleep_score'] || 0);

    const hrvRows = dashList.map(d => parseFloat(d['night HRV'])).filter(v => !isNaN(v) && v > 0);
    const hrv7 = hrvRows.slice(-7);
    const avgHrv7d = hrv7.length > 0 ? (hrv7.reduce((a,b)=>a+b, 0) / hrv7.length) : hrv;

    const hrvEl = document.getElementById('bento-hrv-val');
    if (hrvEl && hrv > 0) hrvEl.innerHTML = `${Math.round(hrv)} <small>ms</small>`;

    const hrvSubEl = document.getElementById('bento-hrv-sub');
    if (hrvSubEl && avgHrv7d > 0) hrvSubEl.textContent = `Media 7g: ${avgHrv7d.toFixed(1)} ms`;

    const rhrEl = document.getElementById('bento-rhr-val');
    if (rhrEl && rhr > 0) rhrEl.innerHTML = `${Math.round(rhr)} <small>bpm</small>`;

    const sleepEl = document.getElementById('bento-sleep-val');
    if (sleepEl && sleepHours > 0) {
        sleepEl.innerHTML = `${sleepHours.toFixed(1)} <small>h</small>`;
    }

    const sleepSubEl = document.getElementById('bento-sleep-sub');
    if (sleepSubEl && sleepScore > 0) {
        const descScore = sleepScore >= 75 ? 'Ricarica Ottimale' : (sleepScore >= 60 ? 'Sonno Discreto' : 'Sonno Breve / Cautela');
        sleepSubEl.textContent = `Score: ${Math.round(sleepScore)} • ${descScore}`;
    }

    const healthStatusEl = document.getElementById('bento-health-status');
    if (healthStatusEl) {
        const isTachy = rhr >= 47;
        const hStatusTxt = isTachy ? 'Fatica Autonomica' : 'Vagale Ottimale';
        const hStatusCol = isTachy ? '#f59e0b' : '#10b981';
        healthStatusEl.textContent = hStatusTxt;
        healthStatusEl.style.color = hStatusCol;
        healthStatusEl.style.borderColor = hStatusCol + '55';
    }

    // 3. READINESS & WORKOUT SUGGESTIONS (COSA FARE OGGI)
    fetch('/api/workout_suggestions')
        .then(r => r.json())
        .then(w => {
            if (!w) return;
            const rBadge = document.getElementById('bento-readiness-badge');
            if (rBadge && w.badge) rBadge.textContent = w.badge.split('—')[0].trim();

            const rSumm = document.getElementById('bento-readiness-summary');
            if (rSumm) {
                rSumm.textContent = `HRV ${Math.round(hrv)} ms • FC ${Math.round(rhr)} bpm • TSB ${tsb >= 0 ? '+' : ''}${tsb.toFixed(1)}`;
            }

            const bTitle = document.getElementById('bento-bike-title');
            if (bTitle) bTitle.textContent = w.bento_bike_title || w.bike_title || 'Bici Z1/Z2';
            const bTarget = document.getElementById('bento-bike-target');
            if (bTarget) bTarget.textContent = w.bento_bike_target || (w.bike_meta && w.bike_meta.includes('TSS') ? w.bike_meta.match(/\d+\s*TSS/)?.[0] || '15 TSS' : '15 TSS');
            const bMeta = document.getElementById('bento-bike-meta');
            if (bMeta) bMeta.textContent = w.bento_bike_meta || w.bike_meta || 'Focus cadenza & recupero';

            const rTitle = document.getElementById('bento-run-title');
            if (rTitle) rTitle.textContent = w.bento_run_title || w.run_title || 'Corsa Programmo';
            const rTarget = document.getElementById('bento-run-target');
            if (rTarget) rTarget.textContent = w.bento_run_target || (w.run_meta && w.run_meta.includes('TSS') ? w.run_meta.match(/\d+\s*TSS/)?.[0] || '45 TSS' : '45 TSS');
            const rMeta = document.getElementById('bento-run-meta');
            if (rMeta) rMeta.textContent = w.bento_run_meta || w.run_meta || 'Setup Fuerteventura';

            const hyDesc = document.getElementById('bento-hyrox-desc');
            if (hyDesc) hyDesc.textContent = w.bento_hyrox_desc || (w.hyrox_title || 'Mobilità & Core');

            const swDesc = document.getElementById('bento-swim-desc');
            if (swDesc) swDesc.textContent = w.bento_swim_desc || (w.swim_title || 'Decompressione Spinale Z1/Z2 (CSS 1:30)');
        })
        .catch(err => console.error("Error fetching workout suggestions for Bento:", err));

    // 4. POLARIZZAZIONE SAN MILLAN
    fetch('/api/load_distribution')
        .then(r => r.json())
        .then(ld => {
            if (!ld || !ld.period_7d) return;
            const p7 = ld.period_7d;
            const ui = ld.ui_strings || {};

            const smBadge = document.getElementById('bento-sanmillan-badge');
            if (smBadge && ui.under_lt1_str) smBadge.textContent = `🟢 Sotto LT1: ${ui.under_lt1_str}`;

            const barZ2 = document.getElementById('bento-bar-z2');
            if (barZ2) barZ2.style.width = `${p7.z2_pct || 54.1}%`;

            const barZ1 = document.getElementById('bento-bar-z1');
            if (barZ1) barZ1.style.width = `${p7.z1_pct || 16.1}%`;

            const barZ3 = document.getElementById('bento-bar-z3');
            if (barZ3) barZ3.style.width = `${p7.z3_pct || 8.5}%`;

            const barZ4Z5 = document.getElementById('bento-bar-z4z5');
            if (barZ4Z5) barZ4Z5.style.width = `${p7.z4z5_pct || 21.3}%`;
        })
        .catch(err => console.error("Error fetching load distribution for Bento:", err));

    // 5. NUTRIZIONE & PESO
    const wVal = document.getElementById('bento-weight-val');
    const kg = parseFloat(last['kg']);
    if (wVal && !isNaN(kg) && kg > 0) {
        wVal.innerHTML = `${kg.toFixed(1)} <small>kg</small>`;
    }

    if (nutri) {
        const statusTag = document.getElementById('bento-status-tag');
        if (statusTag) {
            statusTag.textContent = nutri.status_label || (nutri.status ? nutri.status.toUpperCase() : 'IN CORSO');
            if (nutri.status_color) {
                statusTag.style.color = nutri.status_color;
                statusTag.style.background = nutri.status_color + '22';
            }
        }

        const kVal = document.getElementById('bento-kcal-val');
        if (kVal) {
            const inK = Math.round(nutri.intake_kcal || 0);
            const tarK = Math.round(nutri.target_tdee || 2200);
            kVal.innerHTML = `${inK}<small> / ${tarK}</small>`;
        }

        const cVal = document.getElementById('bento-carbs-val');
        if (cVal) {
            const inC = Math.round(nutri.carbs_g || 0);
            const tarC = Math.round(nutri.target_carbs_g || 180);
            cVal.innerHTML = `${inC}<small> / ${tarC}g</small>`;
        }

        const pVal = document.getElementById('bento-pro-val');
        if (pVal) {
            const inP = Math.round(nutri.protein_g || 0);
            const tarP = Math.round(nutri.target_protein_g || 150);
            pVal.innerHTML = `${inP}<small> / ${tarP}g</small>`;
        }

        const fVal = document.getElementById('bento-fat-val');
        if (fVal) {
            const inF = Math.round(nutri.fat_g || 0);
            const tarF = Math.round(nutri.target_fat_g || 90);
            fVal.innerHTML = `${inF}<small> / ${tarF}g</small>`;
        }

        // Progress bar proportions
        const totCal = (nutri.intake_kcal > 0) ? nutri.intake_kcal : 1;
        const cPct = Math.min(100, Math.round(((nutri.carbs_g * 4) / totCal) * 100));
        const pPct = Math.min(100 - cPct, Math.round(((nutri.protein_g * 4) / totCal) * 100));
        const fPct = Math.min(100 - cPct - pPct, Math.round(((nutri.fat_g * 9) / totCal) * 100));

        const bC = document.getElementById('bento-bar-carbs');
        if (bC) bC.style.width = `${cPct}%`;
        const bP = document.getElementById('bento-bar-pro');
        if (bP) bP.style.width = `${pPct}%`;
        const bF = document.getElementById('bento-bar-fat');
        if (bF) bF.style.width = `${fPct}%`;

        // Water & Salt
        const wWater = document.getElementById('bento-water-val');
        if (wWater && nutri.water_target_liters) wWater.textContent = `${nutri.water_target_liters} L`;

        const wSalt = document.getElementById('bento-salt-val');
        if (wSalt && nutri.salt_caps !== undefined) wSalt.textContent = `${nutri.salt_caps} Caps`;

        // Meals Stream
        const stream = document.getElementById('bento-meals-stream');
        if (stream) {
            const items = nutri.items || [];
            if (items.length === 0) {
                stream.innerHTML = '<div style="color:#64748b; font-size:0.75rem; text-align:center; padding:0.6rem;">Nessun pasto loggato oggi</div>';
            } else {
                stream.innerHTML = items.map(it => `
                    <div class="bento-meal-chip">
                        <span class="bento-meal-name">
                            🍽️ ${it.name} <small style="color:#64748b; font-weight:normal;">(${it.portion_label || it.grams + 'g'})</small>
                        </span>
                        <div style="text-align:right;">
                            <span class="bento-meal-kcal">${Math.round(it.kcal)} kcal</span>
                            <div class="bento-meal-macros">${Math.round(it.carbs)}C • ${Math.round(it.protein)}P • ${Math.round(it.fat)}F</div>
                        </div>
                    </div>
                `).join('');
            }
        }
    }
}

function openQuickAddModal() {
    const m = document.getElementById('bento-quick-add-modal');
    if (m) m.style.display = 'flex';
    const inp = document.getElementById('bento-quick-food-input');
    if (inp) {
        inp.value = '';
        setTimeout(() => inp.focus(), 100);
    }
}

function closeQuickAddModal() {
    const m = document.getElementById('bento-quick-add-modal');
    if (m) m.style.display = 'none';
}

function bentoAddPreset(foodQuery) {
    const inp = document.getElementById('bento-quick-food-input');
    if (inp) inp.value = foodQuery;
    submitQuickFood();
}

function submitQuickFood() {
    const inp = document.getElementById('bento-quick-food-input');
    if (!inp || !inp.value.trim()) return;
    const foodQuery = inp.value.trim();
    closeQuickAddModal();

    fetch('/api/nutrition/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            date: window.currentNutritionDate || '',
            food_name: foodQuery,
            amount: 1,
            unit_type: 'auto'
        })
    })
    .then(r => r.json())
    .then(res => {
        loadNutritionData(window.currentNutritionDate);
    })
    .catch(err => console.error("Error adding food from Bento modal:", err));
}

// Hook into existing app flow
window.updateBentoView = updateBentoView;
window.toggleDashboardView = toggleDashboardView;
window.switchBentoTab = switchBentoTab;
window.openQuickAddModal = openQuickAddModal;
window.closeQuickAddModal = closeQuickAddModal;
window.bentoAddPreset = bentoAddPreset;
window.submitQuickFood = submitQuickFood;
