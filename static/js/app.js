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

function calcEwma(values, span) {
    const alpha = 2.0 / (span + 1.0);
    let ewma = null;
    for (const v of values) {
        if (v !== null && v !== undefined && !isNaN(v)) {
            const fv = parseFloat(v);
            ewma = (ewma === null) ? fv : (alpha * fv + (1.0 - alpha) * ewma);
        }
    }
    return ewma;
}

function evalEwmaPctStatus(current, ewmaRef, warnPct, redPct, reverse = false) {
    if (current === null || current === undefined || ewmaRef === null || ewmaRef === undefined || ewmaRef === 0) {
        return { color: '#10b981', cls: 'up', pct: 0, status: 'optimal' };
    }
    const pct = ((current - ewmaRef) / Math.abs(ewmaRef)) * 100.0;
    const eff = reverse ? -pct : pct;
    if (eff <= -redPct) {
        return { color: '#ef4444', cls: 'down', pct, status: 'alert' };
    } else if (eff <= -warnPct) {
        return { color: '#facc15', cls: 'neutral', pct, status: 'caution' };
    } else {
        return { color: '#10b981', cls: 'up', pct, status: 'optimal' };
    }
}

function updatePctBadge(badgeId, statusObj, tooltip = '') {
    const el = document.getElementById(badgeId);
    if (!el) return;
    const pct = statusObj.pct || 0;
    const sign = pct > 0 ? '+' : '';
    el.textContent = `${sign}${pct.toFixed(1)}%`;
    el.className = `trend-badge ${statusObj.cls}`;
    if (tooltip) el.title = tooltip;
}

function getTrendStatus(delta, threshold = 0.3, reverse = false) {
    const val = reverse ? -delta : delta;
    if (val > threshold) {
        return { color: '#10b981', cls: 'up', status: 'improving' };
    } else if (val < -threshold) {
        return { color: '#ef4444', cls: 'down', status: 'declining' };
    } else {
        return { color: '#facc15', cls: 'neutral', status: 'steady' };
    }
}

function updateBadge(badgeId, delta, threshold = 0.3, reverse = false) {
    const el = document.getElementById(badgeId);
    if (!el) return;
    const sign = delta > 0 ? '+' : '';
    const formatted = `${sign}${delta.toFixed(1)}`;
    el.textContent = formatted;
    
    const trend = getTrendStatus(delta, threshold, reverse);
    el.className = `trend-badge ${trend.cls}`;
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

    // 1. Readiness Date Badge (Stato e colore arrivano dal motore N=1 /api/n1_learning come fonte unica)
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

    function getFullSeries(key) {
        return historical.map(r => getVal(r, key));
    }

    // 2. HRV Card (Media Ponderata EWMA 28g | Giallo <= -6%, Rosso <= -12%)
    const hrvEwma = calcEwma(getFullSeries('night HRV'), 28);
    const hrvStatus = evalEwmaPctStatus(hrvVal, hrvEwma, 6.0, 12.0, false);
    const hrvColor = hrvStatus.color;

    const hrvEl = document.getElementById('kpi-hrv');
    if (hrvEl && hrvVal !== null) {
        hrvEl.innerHTML = `<span style="color:${hrvColor}">${Math.round(hrvVal)} <span style="font-size:0.7em; opacity:0.8;">ms</span></span>`;
    }
    updatePctBadge('trend-hrv', hrvStatus, hrvEwma ? `vs Media Ponderata 28g (${hrvEwma.toFixed(1)} ms) | Giallo ≤ -6% • Rosso ≤ -12%` : '');
    renderSparkline('spark-hrv', hrvSeries, hrvColor);

    // 3. Sleep Score / RHR Card (EWMA 28g | Sonno: Giallo <= -8%, Rosso <= -18% | RHR inv: Giallo >= +4%, Rosso >= +8%)
    const sleepSeries = getSeries('sleep score');
    const sleepEwma = calcEwma(getFullSeries('sleep score'), 28);
    const rhrEwma = calcEwma(getFullSeries('RHR'), 28);
    const sleepStatus = evalEwmaPctStatus(sleepScoreVal, sleepEwma, 8.0, 18.0, false);
    const rhrStatus = evalEwmaPctStatus(rhrVal, rhrEwma, 4.0, 8.0, true);
    const sleepColor = sleepStatus.color;

    const sleepEl = document.getElementById('kpi-sleep');
    if (sleepEl) {
        const sStr = sleepScoreVal !== null ? Math.round(sleepScoreVal) : '---';
        const rStr = rhrVal !== null ? Math.round(rhrVal) : '---';
        const rhrColor = rhrVal === null ? '#94a3b8' : rhrStatus.color;
        sleepEl.innerHTML = `<span style="color:${sleepColor}">${sStr}</span> <span style="opacity:0.5;">/</span> <span style="color:${rhrColor}">${rStr} <span style="font-size:0.65em;">bpm</span></span>`;
    }
    updatePctBadge('trend-sleep', sleepStatus, (sleepEwma && rhrEwma) ? `Sonno vs EWMA 28g (${sleepEwma.toFixed(1)}) | RHR vs EWMA 28g (${rhrEwma.toFixed(1)} bpm)` : '');
    renderSparkline('spark-sleep', sleepSeries, sleepColor);

    // 4. Bilancio TSB Card (Zone fisiologiche TP: Verde >= -10, Giallo -20..-10, Rosso < -20 | Badge vs EWMA 14g)
    const tsbSeries = getSeries('TSB');
    const tsbEwma = calcEwma(getFullSeries('TSB'), 14);
    const tsbDelta = (tsbVal !== null && tsbEwma !== null) ? (tsbVal - tsbEwma) : 0;
    const tsbStatus = (tsbVal !== null && tsbVal < -20.0)
        ? { color: '#ef4444', cls: 'down' }
        : ((tsbVal !== null && tsbVal < -10.0) ? { color: '#facc15', cls: 'neutral' } : { color: '#10b981', cls: 'up' });
    const tsbColor = tsbStatus.color;

    const tsbEl = document.getElementById('kpi-tsb');
    const tsbSubEl = document.getElementById('kpi-tsb-sub');
    const acwrVal = getVal(latest, 'ACWR', 'acwr');

    if (tsbEl && tsbVal !== null) {
        const tsbDisplay = Math.abs(tsbVal % 1) > 0.05 ? tsbVal.toFixed(1) : Math.round(tsbVal).toString();
        tsbEl.innerHTML = `<span style="color:${tsbColor}">${tsbVal > 0 ? '+' : ''}${tsbDisplay}</span> <span style="font-size:0.7em; opacity:0.8;">TSB</span>`;
    }
    if (tsbSubEl && acwrVal !== null) {
        const acwrNum = Math.round(parseFloat(acwrVal) * 100) / 100;
        const acwrColor = (acwrNum > 1.50 || acwrNum < 0.60) ? '#ef4444' : ((acwrNum >= 0.80 && acwrNum <= 1.30) ? '#10b981' : '#facc15');
        tsbSubEl.innerHTML = `<span style="color:${acwrColor}; font-weight:600;">ACWR ${acwrNum.toFixed(2)}</span>`;
    }
    const tsbBadgeEl = document.getElementById('trend-tsb');
    if (tsbBadgeEl) {
        tsbBadgeEl.textContent = `${tsbDelta > 0 ? '+' : ''}${tsbDelta.toFixed(1)}`;
        tsbBadgeEl.className = `trend-badge ${tsbStatus.cls}`;
        if (tsbEwma !== null) tsbBadgeEl.title = `Delta vs EWMA 14g (${tsbEwma >= 0 ? '+' : ''}${tsbEwma.toFixed(1)}) | Verde ≥ -10 • Giallo -20..-10 • Rosso < -20`;
    }
    renderSparkline('spark-tsb', tsbSeries, tsbColor);

    // 5. Total CTL Card (Media Ponderata EWMA 30g | Giallo <= -5%, Rosso <= -10%)
    const ctlSeries = getSeries('CTL');
    const ctlEwma = calcEwma(getFullSeries('CTL'), 30);
    const ctlStatus = evalEwmaPctStatus(ctlVal, ctlEwma, 5.0, 10.0, false);
    const ctlColor = ctlStatus.color;

    const totalCtlEl = document.getElementById('kpi-total-ctl');
    if (totalCtlEl && ctlVal !== null) {
        totalCtlEl.innerHTML = `<span style="color:${ctlColor}">${ctlVal.toFixed(1)}</span> <span style="font-size:0.7em; opacity:0.8;">CTL</span>`;
    }
    updatePctBadge('trend-total-ctl', ctlStatus, ctlEwma ? `vs Media Ponderata 30g (${ctlEwma.toFixed(1)}) | Giallo ≤ -5% • Rosso ≤ -10%` : '');
    renderSparkline('spark-total-ctl', ctlSeries, ctlColor);

    // 6. Bike CTL Card (Media Ponderata EWMA 30g | Giallo <= -8%, Rosso <= -18%)
    const bikeCtlSeries = getSeries('bike_ctl');
    const bCtlEwma = calcEwma(getFullSeries('bike_ctl'), 30);
    const bCtlStatus = evalEwmaPctStatus(bikeCtlVal, bCtlEwma, 8.0, 18.0, false);
    const bCtlColor = bCtlStatus.color;

    const bikeCtlEl = document.getElementById('kpi-bike-ctl');
    if (bikeCtlEl && bikeCtlVal !== null) {
        bikeCtlEl.innerHTML = `<span style="color:${bCtlColor}">${bikeCtlVal.toFixed(1)}</span> <span style="font-size:0.7em; opacity:0.8;">CTL</span>`;
    }
    const bAtlVal = getVal(latest, 'bike_atl', 'atl_bike');
    const bCtlSubEl = document.getElementById('kpi-bike-ctl-sub');
    if (bCtlSubEl && bikeCtlVal !== null && bAtlVal !== null && bikeCtlVal > 0) {
        const bAcwr = Math.round((bAtlVal / bikeCtlVal) * 100) / 100;
        const bAcwrColor = (bAcwr > 1.50 || bAcwr < 0.60) ? '#ef4444' : ((bAcwr >= 0.80 && bAcwr <= 1.30) ? '#10b981' : '#facc15');
        bCtlSubEl.innerHTML = `<span style="color:${bAcwrColor}; font-weight:600;">ACWR ${bAcwr.toFixed(2)}</span>`;
    }
    updatePctBadge('trend-bike-ctl', bCtlStatus, bCtlEwma ? `vs Media Ponderata 30g (${bCtlEwma.toFixed(1)}) | Giallo ≤ -8% • Rosso ≤ -18%` : '');
    renderSparkline('spark-bike-ctl', bikeCtlSeries, bCtlColor);

    // 7. Run CTL Card (Media Ponderata EWMA 30g | Giallo <= -8%, Rosso <= -18%)
    const runCtlSeries = getSeries('run_ctl');
    const rCtlEwma = calcEwma(getFullSeries('run_ctl'), 30);
    const rCtlStatus = evalEwmaPctStatus(runCtlVal, rCtlEwma, 8.0, 18.0, false);
    const rCtlColor = rCtlStatus.color;

    const runCtlEl = document.getElementById('kpi-run-ctl');
    if (runCtlEl && runCtlVal !== null) {
        runCtlEl.innerHTML = `<span style="color:${rCtlColor}">${runCtlVal.toFixed(1)}</span> <span style="font-size:0.7em; opacity:0.8;">CTL</span>`;
    }
    const rAtlVal = getVal(latest, 'run_atl', 'atl_run');
    const rCtlSubEl = document.getElementById('kpi-run-ctl-sub');
    if (rCtlSubEl && runCtlVal !== null && rAtlVal !== null && runCtlVal > 0) {
        const rAcwr = Math.round((rAtlVal / runCtlVal) * 100) / 100;
        const rAcwrColor = (rAcwr > 1.40 || rAcwr < 0.60) ? '#ef4444' : ((rAcwr >= 0.80 && rAcwr <= 1.30) ? '#10b981' : '#facc15');
        rCtlSubEl.innerHTML = `<span style="color:${rAcwrColor}; font-weight:600;">ACWR ${rAcwr.toFixed(2)}</span>`;
    }
    updatePctBadge('trend-run-ctl', rCtlStatus, rCtlEwma ? `vs Media Ponderata 30g (${rCtlEwma.toFixed(1)}) | Giallo ≤ -8% • Rosso ≤ -18%` : '');
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
                        const titleHtml = u.website
                            ? `<a href="${u.website}" target="_blank" rel="noopener" style="color:inherit; text-decoration:none; border-bottom:1px dotted rgba(255,255,255,0.25);"><strong>${u.name}</strong></a>`
                            : `<strong>${u.name}</strong>`;
                        html += `
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; padding: 0.35rem 0.5rem; background: rgba(255,255,255,0.02); border-radius: 6px; border-left: 2px solid ${u.discipline === 'Pista FIDAL' ? '#38bdf8' : 'rgba(255,255,255,0.08)'};">
                            <div>
                                <span>${u.icon || '💡'} ${titleHtml}</span>
                                <span style="font-size:0.7rem; color:var(--text-muted);">${locLabel}${distLabel}</span>
                            </div>
                            <span style="color: var(--text-muted); font-size:0.74rem; font-weight:600; white-space:nowrap; margin-left:0.5rem;">${u.date_fmt} (${u.days_left} gg)</span>
                        </div>`;
                    });
                } else if (!html) {
                    html = `<div style="text-align:center; padding:0.6rem; font-size:0.75rem; color:var(--text-muted);">Nessun evento in programma per questa disciplina nei prossimi 365 giorni.</div>`;
                }

                if (discipline === 'Pista FIDAL') {
                    html += `
                    <div style="margin-top:0.35rem; padding:0.4rem 0.6rem; background:rgba(56,189,248,0.08); border-radius:6px; font-size:0.72rem; display:flex; justify-content:space-between; align-items:center;">
                        <span style="color:#94a3b8;">🔄 Sync automatico attivo con calendario ufficiale FIDAL Toscana</span>
                        <a href="https://toscana.fidal.it/calendario.php" target="_blank" rel="noopener" style="color:#38bdf8; font-weight:700; text-decoration:none;">Apri FIDAL Toscana ↗</a>
                    </div>`;
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
    const headerBtn = document.getElementById('btn-manual-sync');
    const headerTxt = document.getElementById('sync-text');
    const bentoBtn = document.getElementById('btn-bento-sync');
    const bentoTxt = document.getElementById('bento-sync-text');
    const bentoIcon = document.getElementById('bento-sync-icon');

    if (headerTxt) headerTxt.textContent = "⏳ Sincronizzazione...";
    if (headerBtn) headerBtn.style.opacity = "0.7";
    if (bentoTxt) bentoTxt.textContent = "Sincronizzo...";
    if (bentoIcon) bentoIcon.classList.add('spin-anim');
    if (bentoBtn) bentoBtn.style.opacity = "0.75";

    const isLocalServer = (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.port === '8080'
    );

    if (isLocalServer) {
        fetch('/sync')
            .then(res => res.json())
            .then(data => {
                loadData();
                if (headerTxt) headerTxt.textContent = "✅ Dati Aggiornati!";
                if (headerBtn) headerBtn.style.opacity = "1.0";
                if (bentoTxt) bentoTxt.textContent = "Aggiornato! ✓";
                if (bentoIcon) bentoIcon.classList.remove('spin-anim');
                if (bentoBtn) bentoBtn.style.opacity = "1.0";
                setTimeout(() => {
                    if (headerTxt) headerTxt.textContent = "🔄 Aggiorna";
                    if (bentoTxt) bentoTxt.textContent = "Aggiorna";
                }, 3000);
            })
            .catch(err => {
                console.error("Error manual sync:", err);
                if (headerTxt) headerTxt.textContent = "❌ Errore Sync";
                if (headerBtn) headerBtn.style.opacity = "1.0";
                if (bentoTxt) bentoTxt.textContent = "Ricarico...";
                if (bentoIcon) bentoIcon.classList.remove('spin-anim');
                if (bentoBtn) bentoBtn.style.opacity = "1.0";
                setTimeout(() => window.location.reload(), 500);
            });
    } else {
        // GitHub Pages / Static Mode: force reload with cache busting query param
        if (bentoTxt) bentoTxt.textContent = "Ricarico...";
        setTimeout(() => {
            const url = new URL(window.location.href);
            url.searchParams.set('v', Date.now().toString());
            window.location.href = url.toString();
        }, 300);
    }
}

/* ==========================================================================
   ⚖️ PESO CORPOREO, SPESA ENERGETICA & IDRATAZIONE MODULE
   ========================================================================== */
let currentNutritionDate = null;

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
        badge.textContent = 'TARGET 82–83 KG';
    }

    // Colonna 1: Spesa
    const tdeeEl = document.getElementById('nutri-tdee-val');
    if (tdeeEl) tdeeEl.innerHTML = `${(data.tdee || 0).toLocaleString()} <span style="font-size:0.75rem; font-weight:600; opacity:0.8;">kcal</span>`;
    setEl('nutri-bmr-val', `${(data.bmr || 0).toLocaleString()} kcal`);
    setEl('nutri-workout-desc', `${data.workout_icon || '🛌'} ${data.workout_desc || 'Nessuna Attività'}`);
    setEl('nutri-workout-val', `+${data.workout_burn || 0} kcal`);
    setEl('nutri-neat-val', `+${data.neat || 300} kcal`);

    // Colonna 2: Sudore & Liquidi
    const sweatEl = document.getElementById('nutri-sweat-val');
    if (sweatEl) sweatEl.innerHTML = `${data.sweat_liters || 0.0} <span style="font-size:0.75rem; font-weight:600; opacity:0.8;">L</span>`;
    setEl('nutri-sweat-sub', `${data.sweat_liters || 0.0} L (${(data.workout_burn || 0) > 0 ? 'Sessione Attiva' : 'Riposo'})`);
    setEl('nutri-water-target', `${data.water_target_liters || 2.5} L / giorno`);
    setEl('nutri-salt-caps', `${data.salt_caps || 0} ${(data.salt_caps || 0) === 1 ? 'Capsula' : 'Capsule'}`);

    // Stima Variazione Peso & Trend EWMA
    const wEst = data.weekly_weight_estimate;
    if (wEst) {
        setEl('nutri-weight-real-val', `${wEst.current_weight || 84.8} kg`);
        if (wEst.prev_weight) {
            setEl('nutri-weight-real-hint', `Precedente: ${wEst.prev_weight} kg (${wEst.prev_weight_date || ''})`);
        } else {
            setEl('nutri-weight-real-hint', 'Peso Baseline Registrato');
        }

        const deltaEl = document.getElementById('nutri-weight-delta-val');
        if (deltaEl) {
            deltaEl.innerHTML = `${wEst.weighted_avg_weight || wEst.current_weight || 84.8} <span class="nutri-weight-unit">kg</span>`;
            deltaEl.style.color = '#38bdf8';
        }
        setEl('nutri-weight-delta-hint', 'Target Longevità: 82–83 kg (~12% BF)');
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

function setupWeightInput() {
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
    setupWeightInput();
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
    if (view === 'desktop') {
        toggleDashboardView('desktop');
        return;
    }
    if (view === 'bento') {
        toggleDashboardView('bento');
        return;
    }

    const saved = localStorage.getItem('longevity_view_mode');
    if (saved === 'desktop') {
        toggleDashboardView('desktop');
    } else {
        toggleDashboardView('bento');
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
        'weight': 'bento-sec-weight',
        'nutrition': 'bento-sec-weight'
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

    // 0. TOP CONTEXT PILL (DATE & LOCATION) - preserva location SSR
    const contextPill = document.querySelector('.bento-context-pill span:last-child');
    if (contextPill && last) {
        const dDay = last['day'];
        const dMonth = last['month'];
        const dYear = last['year'];
        if (dDay && dMonth && dYear) {
            const curTxt = contextPill.textContent || '';
            const locMatch = curTxt.match(/📍\s*([^•]+)/);
            const locName = locMatch ? locMatch[1].trim() : 'Fuerteventura';
            contextPill.innerHTML = `📍 ${locName} • <strong>${dDay}/${dMonth}/${dYear}</strong>`;
        }
    }

    // 0B. BANNER SESSIONE COMPLETATA OGGI
    const completedBanner = document.getElementById('bento-completed-workout');
    if (completedBanner && last) {
        const dDay = last['day'], dMonth = last['month'], dYear = last['year'];
        const now = new Date();
        const isToday = parseInt(dDay) === now.getDate() && parseInt(dMonth) === (now.getMonth() + 1) && parseInt(dYear) === now.getFullYear();
        const trainType = String(last['Train type'] || '').trim();
        const durMin = parseFloat(last['durata min'] || 0);
        const tssVal = parseFloat(last['TSS'] || last['hrTSS'] || 0);
        
        if (isToday && trainType && trainType.toLowerCase() !== 'nan' && trainType.toLowerCase() !== 'none' && (durMin > 0 || tssVal > 0)) {
            completedBanner.style.display = 'block';
            const sLow = trainType.toLowerCase();
            let cIcon = '🏅';
            let cName = trainType;
            if (trainType.includes('+')) {
                cIcon = sLow.includes('run') ? '🏃' : (sLow.includes('swim') ? '🏊' : '🚴');
                cName = trainType;
            } else if (sLow.includes('parawing') || sLow.includes('wing') || sLow.includes('foil') || sLow.includes('surf') || sLow.includes('vela')) { cIcon = '🌊'; cName = 'Parawing'; }
            else if (sLow.includes('bike') || sLow.includes('ride') || sLow.includes('ciclismo') || sLow.includes('bici')) { cIcon = '🚴'; cName = 'Ciclismo'; }
            else if (sLow.includes('run') || sLow.includes('corsa')) { cIcon = '🏃'; cName = 'Corsa'; }
            else if (sLow.includes('swim') || sLow.includes('nuoto')) { cIcon = '🏊'; cName = 'Nuoto'; }
            else if (sLow.includes('mx') || sLow.includes('motocross')) { cIcon = '🏍️'; cName = 'Motocross'; }

            const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
            setTxt('bento-completed-icon', cIcon);
            setTxt('bento-completed-title', `${cName} Completato`);
            setTxt('bento-completed-tss', `${tssVal.toFixed(1)} TSS`);
            
            const distVal = parseFloat(last['distanza'] || last['dist_km'] || 0);
            const hrVal = parseFloat(last['HR media'] || last['hr_media'] || 0);
            const eleVal = parseFloat(last['dislivello'] || 0);
            
            let metaParts = [];
            if (distVal > 0) metaParts.push(`${distVal.toFixed(1)} km`);
            if (durMin > 0) metaParts.push(`${Math.round(durMin)} min`);
            if (hrVal > 0) metaParts.push(`FC ${Math.round(hrVal)} bpm`);
            if (eleVal > 0) metaParts.push(`+${Math.round(eleVal)}m D+`);
            setTxt('bento-completed-meta', metaParts.join(' • '));
            // Nascondi Slot 1 per evitare doppione verticale quando oggi hai già completato la sessione
            const slot1 = document.getElementById('bento-slot-primary');
            if (slot1) slot1.style.display = 'none';
        } else {
            completedBanner.style.display = 'none';
            const slot1 = document.getElementById('bento-slot-primary');
            if (slot1) slot1.style.display = 'flex';
        }
    }

    // 0C. COUNTDOWN GARA TARGET IN TESTATA BENTO
    fetch('/api/race_prep')
        .then(r => r.json())
        .then(rp => {
            const pill = document.getElementById('bento-race-countdown');
            const tr = rp && (rp.target_event || rp.target_race);
            if (pill && tr && tr.days_left != null && tr.days_left >= 0) {
                let rNm = String(tr.name || 'Gara Target').replace(/^Test\s+/i, '').split('(')[0].trim();
                if (rNm.length > 22) rNm = rNm.slice(0, 20).trimEnd() + '…';
                const dLbl = tr.days_left === 0 ? 'OGGI!' : `-${tr.days_left} gg`;
                pill.textContent = `🏁 ${rNm} • ${dLbl}`;
                pill.style.display = 'inline-flex';
            }
        })
        .catch(() => {});

    // 1. CARICO & TRAINING (CTL, ATL, TSB, Ramp Rate 7g, ACWR — colori EWMA coerenti col Desktop)
    const ctl = parseFloat(last['CTL'] || 0);
    const atl = parseFloat(last['ATL'] || (ctl - (parseFloat(last['TSB'] || 0))));
    const tsb = parseFloat(last['TSB'] || 0);
    const bikeCtl = parseFloat(last['bike_ctl'] || last['ctl_bike'] || last['Bike CTL'] || 23.7);
    const runCtl = parseFloat(last['run_ctl'] || last['ctl_run'] || last['Run CTL'] || 9.5);
    const acwr = (ctl > 0) ? Math.round((atl / ctl) * 100) / 100 : 1.0;

    const ctlAll = dashList.map(d => parseFloat(d['CTL'])).filter(v => !isNaN(v));
    const ctlEwma30 = calcEwma(ctlAll, 30);
    const ctlSt = evalEwmaPctStatus(ctl, ctlEwma30, 5.0, 10.0, false);

    const ctlEl = document.getElementById('bento-ctl-val');
    if (ctlEl) {
        ctlEl.textContent = ctl.toFixed(1);
        ctlEl.style.color = ctlSt.color;
    }

    const atlEl = document.getElementById('bento-atl-val');
    if (atlEl) atlEl.textContent = atl.toFixed(1);

    const tsbEl = document.getElementById('bento-tsb-val');
    if (tsbEl) {
        tsbEl.textContent = `${tsb >= 0 ? '+' : ''}${tsb.toFixed(1)}`;
        tsbEl.style.color = (tsb < -20) ? '#ef4444' : (tsb < -10 ? '#facc15' : '#10b981');
    }

    const tsbStatusEl = document.getElementById('bento-tsb-status');
    if (tsbStatusEl) {
        tsbStatusEl.textContent = (tsb >= 8) ? 'Freschezza' : (tsb >= 0 ? 'Ricarica' : (tsb >= -10 ? 'Carico OK' : 'Fatica'));
    }

    const rampEl = document.getElementById('bento-ramprate-val');
    if (rampEl && ctlAll.length >= 2) {
        const ctl7Ago = ctlAll.length >= 8 ? ctlAll[ctlAll.length - 8] : ctlAll[0];
        const ramp7 = Math.round((ctl - ctl7Ago) * 10) / 10;
        const rampCol = (ramp7 > 5.0 || ramp7 < -5.0) ? '#ef4444' : ((ramp7 >= -2.5 && ramp7 <= 4.5) ? '#10b981' : '#facc15');
        rampEl.textContent = `${ramp7 > 0 ? '+' : ''}${ramp7.toFixed(1)}`;
        rampEl.style.color = rampCol;
    }

    const acwrBadge = document.getElementById('bento-acwr-badge');
    if (acwrBadge) {
        const acwrCol = (acwr > 1.50 || acwr < 0.60) ? '#ef4444' : (acwr >= 0.80 && acwr <= 1.30 ? '#10b981' : '#facc15');
        acwrBadge.textContent = `🛡️ ACWR ${acwr.toFixed(2)} (${acwr <= 1.30 && acwr >= 0.80 ? 'Ottimale' : 'Attenzione'})`;
        acwrBadge.style.color = acwrCol;
        acwrBadge.style.borderColor = acwrCol + '55';
        acwrBadge.style.background = acwrCol + '18';
    }

    const bCtlEl = document.getElementById('bento-bike-ctl');
    if (bCtlEl) bCtlEl.textContent = bikeCtl.toFixed(1);

    const rCtlEl = document.getElementById('bento-run-ctl');
    if (rCtlEl) rCtlEl.textContent = runCtl.toFixed(1);

    // 2. BIOMETRICHE (HRV, RHR, SONNO — con EWMA 28g dinamico reale)
    const hrvRows = dashList.map(d => parseFloat(d['night HRV'] ?? d['hrv'])).filter(v => !isNaN(v) && v > 0);
    const rhrRows = dashList.map(d => parseFloat(d['RHR'] ?? d['rhr'])).filter(v => !isNaN(v) && v > 0);
    const rawHrv = parseFloat(last['night HRV'] ?? last['hrv']);
    const rawRhr = parseFloat(last['RHR'] ?? last['rhr']);
    const hrv = (!isNaN(rawHrv) && rawHrv > 0) ? rawHrv : (hrvRows.length > 0 ? hrvRows[hrvRows.length - 1] : 0);
    const rhr = (!isNaN(rawRhr) && rawRhr > 0) ? rawRhr : (rhrRows.length > 0 ? rhrRows[rhrRows.length - 1] : 0);
    const sleepHours = parseFloat(last['ore sonno'] || last['ore_sonno'] || last['Sleep duration'] || last['Sonno'] || 0);
    const sleepScore = parseFloat(last['sleep score'] || last['sleep_score'] || 0);

    const hrv7 = hrvRows.slice(-7);
    const avgHrv7d = hrv7.length > 0 ? (hrv7.reduce((a,b)=>a+b, 0) / hrv7.length) : hrv;
    const hrvEwma28 = calcEwma(hrvRows, 28);

    // Altini 30-day Baseline & Normal Range (SWC = 0.75 * SD)
    const hrv30 = hrvRows.slice(-30);
    const avgHrv30d = hrv30.length > 0 ? (hrv30.reduce((a,b)=>a+b, 0) / hrv30.length) : 50.6;
    const stdHrv30d = hrv30.length > 1 ? Math.sqrt(hrv30.map(x => Math.pow(x - avgHrv30d, 2)).reduce((a,b)=>a+b, 0) / (hrv30.length - 1)) : 4.2;
    const swc = 0.75 * stdHrv30d;
    const hrvLow = Math.round(avgHrv30d - swc);
    const hrvHigh = Math.round(avgHrv30d + swc);

    // RHR 30-day Baseline
    const rhr30 = rhrRows.slice(-30);
    const avgRhr30d = rhr30.length > 0 ? (rhr30.reduce((a,b)=>a+b, 0) / rhr30.length) : 45.0;
    const deltaRhr = rhr - avgRhr30d;

    const hrvEl = document.getElementById('bento-hrv-val');
    if (hrvEl && hrv > 0) hrvEl.innerHTML = `${Math.round(hrv)} <small>ms</small>`;

    const hrvSubEl = document.getElementById('bento-hrv-sub');
    if (hrvSubEl && hrv > 0) {
        if (hrv > hrvHigh) {
            const zScore = ((hrv - avgHrv30d) / stdHrv30d).toFixed(1);
            hrvSubEl.textContent = `Norma: ${hrvLow}–${hrvHigh} ms (+${zScore}σ)`;
        } else if (hrv < hrvLow) {
            const zScore = ((hrv - avgHrv30d) / stdHrv30d).toFixed(1);
            hrvSubEl.textContent = `Norma: ${hrvLow}–${hrvHigh} ms (${zScore}σ Cautela)`;
        } else {
            hrvSubEl.textContent = `Norma: ${hrvLow}–${hrvHigh} ms (Omeostasi OK)`;
        }
    }

    const rhrEl = document.getElementById('bento-rhr-val');
    if (rhrEl && rhr > 0) rhrEl.innerHTML = `${Math.round(rhr)} <small>bpm</small>`;

    const rhrSubEl = document.getElementById('bento-rhr-sub');
    if (rhrSubEl && rhr > 0) {
        const dStr = deltaRhr > 0 ? `+${deltaRhr.toFixed(0)}` : `${deltaRhr.toFixed(0)}`;
        rhrSubEl.textContent = `Baseline: ${Math.round(avgRhr30d)} bpm (${dStr} bpm)`;
    }

    const sleepEl = document.getElementById('bento-sleep-val');
    if (sleepEl && sleepHours > 0) {
        sleepEl.innerHTML = `${sleepHours.toFixed(1)} <small>h</small>`;
    }

    const sleepSubEl = document.getElementById('bento-sleep-sub');
    if (sleepSubEl && sleepScore > 0) {
        const descScore = sleepScore >= 75 ? 'Ricarica Piena' : (sleepScore >= 60 ? 'Sonno Discreto' : 'Sonno Breve / Cautela');
        sleepSubEl.textContent = `Score ${Math.round(sleepScore)} • ${descScore}`;
    }

    const snaStatusEl = document.getElementById('bento-sna-status');
    if (snaStatusEl) {
        if (hrv > hrvHigh && rhr <= avgRhr30d) {
            snaStatusEl.textContent = 'Parasimpatico Dominante';
            snaStatusEl.className = 'text-brand-emerald';
        } else if (hrv < hrvLow || rhr >= avgRhr30d + 2) {
            snaStatusEl.textContent = 'Simpatico Attivo';
            snaStatusEl.className = 'text-brand-amber';
        } else {
            snaStatusEl.textContent = 'Parasimpatico Stabile';
            snaStatusEl.className = 'text-brand-sky';
        }
    }

    const base30El = document.getElementById('bento-base-30g');
    if (base30El && hrvEwma28) {
        base30El.textContent = `(EWMA ${hrvEwma28.toFixed(1)})`;
    }

    const trend7gEl = document.getElementById('bento-trend-7g');
    if (trend7gEl && avgHrv7d > 0) {
        trend7gEl.textContent = `${avgHrv7d.toFixed(1)} ms`;
    }

    const healthStatusEl = document.getElementById('bento-health-status');
    if (healthStatusEl) {
        const isTachy = rhr >= 48 || (hrv < hrvLow - 5);
        const isCareful = rhr >= 47 || hrv < hrvLow;
        const hStatusTxt = isTachy ? 'Stress Severo' : (isCareful ? 'Fatica Autonomica' : 'Vagale Ottimale');
        const hStatusCol = isTachy ? '#ef4444' : (isCareful ? '#facc15' : '#10b981');
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
                const hrvTxt = hrv > 0 ? `${Math.round(hrv)} ms` : '-- ms';
                const rhrTxt = rhr > 0 ? `${Math.round(rhr)} bpm` : '-- bpm';
                rSumm.textContent = `HRV ${hrvTxt} • FC ${rhrTxt} • TSB ${tsb >= 0 ? '+' : ''}${tsb.toFixed(1)}`;
            }

            const wIcon = document.getElementById('bento-workout-icon');
            const bTitle = document.getElementById('bento-bike-title');
            const bt = (w.bento_bike_title || w.bike_title || '').toLowerCase();
            if (bTitle) bTitle.textContent = w.bento_bike_title || w.bike_title || 'Focus Programma';
            if (wIcon && bt) {
                if (bt.includes('pista') || bt.includes('corsa') || bt.includes('tartan') || bt.includes('4x1000')) wIcon.textContent = '🏃‍♂️';
                else if (bt.includes('nuoto') || bt.includes('vasca')) wIcon.textContent = '🏊‍♂️';
                else if (bt.includes('parawing') || bt.includes('wing') || bt.includes('foil')) wIcon.textContent = '🌊';
                else if (bt.includes('bici') || bt.includes('ciclismo')) wIcon.textContent = '🚴';
                else if (bt.includes('riposo')) wIcon.textContent = '🛌';
                else if (bt.includes('scarico') || bt.includes('mobilit')) wIcon.textContent = '🧘';
            }
            const bTarget = document.getElementById('bento-bike-target');
            if (bTarget) bTarget.textContent = w.bento_bike_target || (w.bike_meta && w.bike_meta.includes('TSS') ? w.bike_meta.match(/\d+\s*TSS/)?.[0] || '60 TSS' : '60 TSS');
            const bMeta = document.getElementById('bento-bike-meta');
            if (bMeta) bMeta.textContent = w.bento_bike_meta || w.bike_meta || 'Focus cadenza & recupero';

            const rTitle = document.getElementById('bento-run-title');
            const rt = (w.bento_run_title || w.run_title || '');
            if (rTitle) rTitle.textContent = rt || 'Cross-Training & Decompressione';
            const slot2Icon = document.getElementById('bento-slot2-icon');
            const rtLow = rt.toLowerCase();
            if (slot2Icon && rtLow) {
                if (rtLow.includes('bici') || rtLow.includes('ciclismo')) slot2Icon.textContent = '🚴';
                else if (rtLow.includes('nuoto') || rtLow.includes('vasca')) slot2Icon.textContent = '🏊‍♂️';
                else if (rtLow.includes('corsa') || rtLow.includes('pista') || rtLow.includes('tartan')) slot2Icon.textContent = '🏃‍♂️';
                else if (rtLow.includes('riposo')) slot2Icon.textContent = '🛌';
                else if (rtLow.includes('scarico') || rtLow.includes('mobilit')) slot2Icon.textContent = '🧘';
            }
            const rTarget = document.getElementById('bento-run-target');
            if (rTarget) {
                rTarget.textContent = w.bento_run_target || '25 TSS';
                if (w.bento_run_target && w.bento_run_target.includes('ZERO CORSA')) {
                    rTarget.style.color = '#ef4444';
                    rTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                    rTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
                } else {
                    rTarget.style.color = '#38bdf8';
                    rTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                    rTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.12)';
                }
            }
            const rMeta = document.getElementById('bento-run-meta');
            if (rMeta) rMeta.textContent = w.bento_run_meta || w.run_meta || 'Setup Fuerteventura';

            const hyDesc = document.getElementById('bento-hyrox-desc');
            if (hyDesc) hyDesc.textContent = w.bento_hyrox_desc || (w.hyrox_title || 'Mobilità & Core');

            const swDesc = document.getElementById('bento-swim-desc');
            if (swDesc) swDesc.textContent = w.bento_swim_desc || (w.swim_title || 'Decompressione Spinale Z1/Z2 (CSS 1:30)');
        })
        .catch(err => console.error("Error fetching workout suggestions for Bento:", err));

    // 3B. N=1 LEARNING & BIOLOGICAL BATTERY & PLAN B
    fetch('/api/n1_learning')
        .then(r => r.json())
        .then(n1 => {
            if (!n1) return;
            const cur = n1.current_readiness;
            if (cur) {
                const bBadge = document.getElementById('bento-battery-badge');
                if (bBadge && cur.battery_label) {
                    bBadge.textContent = cur.battery_label;
                    bBadge.style.color = cur.battery_color || cur.color;
                }
                const bPct = document.getElementById('bento-battery-pct');
                if (bPct && cur.battery_pct != null) {
                    bPct.textContent = `${cur.battery_pct}%`;
                    bPct.style.color = cur.battery_color || cur.color;
                }
                const bBar = document.getElementById('bento-battery-bar');
                if (bBar && cur.battery_pct != null) {
                    bBar.style.width = `${cur.battery_pct}%`;
                    bBar.style.backgroundColor = cur.battery_color || cur.color;
                }
                const dPill = document.getElementById('bento-decision-pill');
                if (dPill && cur.decision_badge) {
                    dPill.textContent = cur.decision_badge;
                    dPill.style.color = cur.color;
                    dPill.style.borderColor = cur.color + '55';
                    dPill.style.backgroundColor = cur.color + '18';
                }
                window._currentReadinessTier = cur.tier || (cur.battery_label && cur.battery_label.includes('GOLD') ? 'GOLD' : (cur.battery_label && cur.battery_label.includes('ROSSO') ? 'ROSSO' : (cur.battery_label && cur.battery_label.includes('GIALLO') ? 'GIALLO' : 'SILVER')));
                // Desktop Elements (Single Source of Truth dal motore N=1)
                const dBadge = document.getElementById('desktop-battery-badge');
                if (dBadge && cur.battery_label) {
                    dBadge.textContent = cur.battery_label;
                    dBadge.style.color = cur.battery_color || cur.color;
                }
                const dPct = document.getElementById('desktop-battery-pct');
                if (dPct && cur.battery_pct != null) {
                    dPct.textContent = `${cur.battery_pct}%`;
                    dPct.style.color = cur.battery_color || cur.color;
                }
                const dReadiness = document.getElementById('kpi-readiness');
                if (dReadiness && cur.zone) {
                    dReadiness.textContent = cur.zone;
                    dReadiness.style.color = cur.color;
                }
                const dReadinessDesc = document.getElementById('kpi-readiness-desc');
                if (dReadinessDesc && cur.desc) {
                    dReadinessDesc.textContent = cur.desc;
                    dReadinessDesc.style.color = cur.color;
                }
                const dCard = document.getElementById('card-readiness');
                if (dCard && cur.zone) {
                    dCard.classList.remove('theme-ready', 'theme-golden', 'theme-careful', 'theme-stop', 'theme-gold', 'theme-silver', 'theme-yellow', 'theme-red');
                    const tCls = cur.zone === 'ROSSO' ? 'theme-red' : (cur.zone === 'GIALLO' ? 'theme-yellow' : (cur.zone === 'GOLD' ? 'theme-gold' : 'theme-silver'));
                    dCard.classList.add(tCls);
                    dCard.style.borderColor = cur.color;
                    dCard.style.boxShadow = `0 0 20px ${cur.color}33`;
                    dCard.querySelectorAll('.mini-histogram .bar').forEach(b => { b.style.backgroundColor = cur.color; });
                }
            }

            const gap = n1.engine_chassis_gap;
            if (gap) {
                const cBadge = document.getElementById('bento-chassis-badge');
                if (cBadge) {
                    cBadge.style.color = gap.color;
                    cBadge.style.borderColor = gap.color + '55';
                    cBadge.style.backgroundColor = gap.color + '18';
                }
                const cDot = document.getElementById('bento-ratio-dot');
                if (cDot && gap.color) {
                    cDot.style.backgroundColor = gap.color;
                }
                const cRatio = document.getElementById('bento-chassis-ratio');
                if (cRatio && (gap.ratio_label || gap.ratio_pct != null)) {
                    cRatio.textContent = gap.ratio_label || `${Math.round(gap.ratio_pct)}%`;
                }
                const cStatus = document.getElementById('bento-chassis-status');
                if (cStatus) {
                    cStatus.textContent = `(${gap.short_status || gap.label || 'Equilibrato'})`;
                }
                const dChassis = document.getElementById('desktop-chassis-badge');
                if (dChassis && gap.badge) {
                    const rLbl = gap.ratio_label || (Math.round(gap.ratio_pct) + '%');
                    dChassis.textContent = `⚖️ Telaio: ${rLbl}`;
                    dChassis.title = `Telaio/Motore: ${rLbl} (${gap.short_status || 'Equilibrato'})`;
                    dChassis.style.color = gap.color;
                }
                const cHint = document.getElementById('bento-chassis-hint');
                if (cHint && gap.text) {
                    cHint.textContent = gap.text;
                }
            }

            const pb = n1.tomorrow_guidance && n1.tomorrow_guidance.plan_b;
            if (pb) {
                const pbTitle = document.getElementById('bento-planb-title');
                if (pbTitle && pb.title) pbTitle.textContent = pb.title;
                const dPbTitle = document.getElementById('desktop-planb-title');
                if (dPbTitle && pb.title) dPbTitle.textContent = `🌪️ ${pb.title}`;

                const pbTarget = document.getElementById('bento-planb-target');
                if (pbTarget && pb.target) pbTarget.textContent = pb.target;
                const dPbTarget = document.getElementById('desktop-planb-target');
                if (dPbTarget && pb.target) dPbTarget.textContent = pb.target;

                const pbDesc = document.getElementById('bento-planb-desc');
                if (pbDesc && pb.desc) pbDesc.textContent = `${pb.desc}${pb.target ? ' (' + pb.target + ')' : ''}`;
                const dPbDesc = document.getElementById('desktop-planb-desc');
                if (dPbDesc && pb.desc) dPbDesc.textContent = pb.desc;
            }

            // N=1 Physiology Drift Alert (visibile solo se scatta un cambiamento significativo)
            const physBox = document.getElementById('bento-phys-alert');
            const pAlerts = n1.physiology_alerts || [];
            if (physBox) {
                if (pAlerts.length > 0) {
                    const topAl = pAlerts[0];
                    const isWarn = topAl.type === 'warning';
                    physBox.style.display = 'block';
                    physBox.style.borderLeftColor = isWarn ? '#f59e0b' : '#10b981';
                    physBox.style.background = isWarn ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.10)';
                    physBox.innerHTML = `<strong>${isWarn ? '⚠️' : '🧬'} ${topAl.title}</strong><br><span style="color:#94a3b8;">${topAl.action}</span>`;
                } else {
                    physBox.style.display = 'none';
                }
            }
        })
        .catch(err => console.error("Error fetching N=1 learning for Bento:", err));

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
            const txtZ2 = document.getElementById('bento-txt-z2');
            if (barZ2 && p7.z2_pct != null) barZ2.style.width = `${p7.z2_pct}%`;
            if (txtZ2 && p7.z2_pct != null) txtZ2.textContent = `${p7.z2_pct}%`;

            const barZ1 = document.getElementById('bento-bar-z1');
            const txtZ1 = document.getElementById('bento-txt-z1');
            if (barZ1 && p7.z1_pct != null) barZ1.style.width = `${p7.z1_pct}%`;
            if (txtZ1 && p7.z1_pct != null) txtZ1.textContent = `${p7.z1_pct}%`;

            const barZ3 = document.getElementById('bento-bar-z3');
            const txtZ3 = document.getElementById('bento-txt-z3');
            if (barZ3 && p7.z3_pct != null) barZ3.style.width = `${p7.z3_pct}%`;
            if (txtZ3 && p7.z3_pct != null) txtZ3.textContent = `${p7.z3_pct}%`;

            const barZ4Z5 = document.getElementById('bento-bar-z4z5');
            const txtZ4Z5 = document.getElementById('bento-txt-z4z5');
            if (barZ4Z5 && p7.z4z5_pct != null) barZ4Z5.style.width = `${p7.z4z5_pct}%`;
            if (txtZ4Z5 && p7.z4z5_pct != null) txtZ4Z5.textContent = `${p7.z4z5_pct}%`;
        })
        .catch(err => console.error("Error fetching load distribution for Bento:", err));

    // 5. PESO CORPOREO & IDRATAZIONE (scansione ultimo peso valido + delta consolidato reale)
    const wVal = document.getElementById('bento-weight-val');
    const wDelta = document.getElementById('bento-weight-delta');
    const kgVals = dashList.map(d => parseFloat(d['kg'])).filter(v => !isNaN(v) && v > 40 && v < 150);
    const latestKg = kgVals.length > 0 ? kgVals[kgVals.length - 1] : null;
    if (wVal && latestKg !== null) {
        wVal.innerHTML = `${latestKg.toFixed(1)} <small>kg</small>`;
    }
    if (wDelta && latestKg !== null && kgVals.length >= 3) {
        const kgMean = kgVals.reduce((a, b) => a + b, 0) / kgVals.length;
        const kgDiff = latestKg - kgMean;
        wDelta.textContent = `${kgDiff >= 0 ? '+' : ''}${kgDiff.toFixed(1)} kg vs media (${kgMean.toFixed(1)} kg)`;
        wDelta.style.color = kgDiff <= 0.1 ? '#10b981' : '#facc15';
    }

    if (nutri) {
        const bmrEl = document.getElementById('bento-bmr-val');
        if (bmrEl) bmrEl.innerHTML = `${Math.round(nutri.bmr || 2082).toLocaleString()} <small>kcal</small>`;

        const wBurnEl = document.getElementById('bento-workout-val');
        if (wBurnEl) {
            wBurnEl.innerHTML = nutri.workout_burn ? `+${nutri.workout_burn} <small>kcal</small>` : '-- <small>kcal</small>';
        }

        const tdeeEl = document.getElementById('bento-tdee-val');
        if (tdeeEl) tdeeEl.innerHTML = `${Math.round(nutri.tdee || 2705).toLocaleString()} <small>kcal</small>`;

        // Water & Salt
        const wWater = document.getElementById('bento-water-val');
        if (wWater && nutri.water_target_liters) wWater.textContent = `${nutri.water_target_liters} L`;

        const wSalt = document.getElementById('bento-salt-val');
        if (wSalt && nutri.salt_caps !== undefined) wSalt.textContent = `${nutri.salt_caps} Caps`;
    }

    // 6. NATIVE iOS DOCK SCROLL-SPY
    if (!window._bentoScrollSpyInit && typeof IntersectionObserver !== 'undefined') {
        window._bentoScrollSpyInit = true;
        const secTabMap = {
            'bento-sec-today': 'today',
            'bento-sec-load': 'load',
            'bento-sec-health': 'health',
            'bento-sec-zones': 'zones',
            'bento-sec-weight': 'weight'
        };
        const obs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const tabKey = secTabMap[entry.target.id];
                    if (tabKey) {
                        document.querySelectorAll('.bento-floating-dock .dock-item').forEach(b => {
                            b.classList.toggle('active', b.dataset.tab === tabKey);
                        });
                    }
                }
            });
        }, { rootMargin: '-20% 0px -65% 0px', threshold: 0.05 });
        Object.keys(secTabMap).forEach(id => {
            const el = document.getElementById(id);
            if (el) obs.observe(el);
        });
    }
}

function pushWorkoutToGarmin(sport) {
    sport = sport || 'bike';
    const btn = document.getElementById(`btn-push-garmin-${sport}`);
    const statusEl = document.getElementById('garmin-push-status');
    const origText = btn ? btn.innerHTML : '';
    
    if (btn) {
        btn.innerHTML = '⏳ Invio a Garmin...';
        btn.disabled = true;
    }
    if (statusEl) {
        statusEl.textContent = 'Connessione a Garmin Connect...';
        statusEl.style.color = '#38bdf8';
    }

    const tier = window._currentReadinessTier || 'SILVER';
    fetch('/api/garmin/push_workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sport: sport, readiness_tier: tier })
    })
    .then(r => r.json())
    .then(res => {
        if (res.status === 'ok') {
            if (btn) {
                btn.innerHTML = '✅ Inviato a Garmin!';
                btn.style.borderColor = '#10b981';
                btn.style.color = '#10b981';
            }
            if (statusEl) {
                statusEl.textContent = `Pronto su Garmin! (${res.workout_name || 'Workout'})`;
                statusEl.style.color = '#10b981';
            }
            setTimeout(() => {
                if (btn) {
                    btn.innerHTML = origText;
                    btn.disabled = false;
                    btn.style.borderColor = '';
                    btn.style.color = '';
                }
                if (statusEl) statusEl.textContent = '';
            }, 6000);
        } else {
            if (btn) {
                btn.innerHTML = '⚠️ Errore Invio';
                btn.disabled = false;
            }
            if (statusEl) {
                statusEl.textContent = res.message || 'Errore durante l\'invio';
                statusEl.style.color = '#ef4444';
            }
        }
    })
    .catch(err => {
        if (btn) {
            btn.innerHTML = '⚠️ Errore Rete';
            btn.disabled = false;
        }
        if (statusEl) {
            statusEl.textContent = 'Errore di connessione al server.';
            statusEl.style.color = '#ef4444';
        }
    });
}

// Hook into existing app flow
window.updateBentoView = updateBentoView;
window.toggleDashboardView = toggleDashboardView;
window.switchBentoTab = switchBentoTab;
window.pushWorkoutToGarmin = pushWorkoutToGarmin;


