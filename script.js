/* CTB */
function calculateMins(eta) {
    if (!eta) return '\u200E';

    const etaDate = new Date(eta);
    const now = new Date();
    const diffInSeconds = Math.floor((etaDate - now) / 1000);

    // If ETA has passed, display 'Due'
    if (diffInSeconds <= 0) return 'Due';

    const mins = Math.floor(diffInSeconds / 60);
    const secs = diffInSeconds % 60;

    // Build the format based on remaining time
    if (mins > 0) {
        return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    
    return `${secs}s`;
}

function capital(str) {
  if (!str) return "";
  
  return str
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

const busList_a = [
    { stopId_CTB: '001119', stopId_KMB: '', route: '7' , company: 'CTB'},
    { stopId_CTB: '001119', stopId_KMB: '', route: '90B' , company: 'CTB'},
    { stopId_CTB: '001119', stopId_KMB: '', route: '91' , company: 'CTB'},
    { stopId_CTB: '001119', stopId_KMB: '', route: '4' , company: 'CTB'},
    { stopId_CTB: '001119', stopId_KMB: '', route: '4X' , company: 'CTB'},
/*    { stopId_CTB: '001119', stopId_KMB: '', route: '970' , company: 'CTB'},
    { stopId_CTB: '001119', stopId_KMB: '', route: '30X' , company: 'CTB'},
    { stopId_CTB: '001119', stopId_KMB: '', route: '33X' , company: 'CTB'},
    { stopId_CTB: '001119', stopId_KMB: '', route: '37A' , company: 'CTB'},*/
    { stopId_CTB: '001119', stopId_KMB: '', route: '970X' , company: 'CTB'},
    { stopId_CTB: '001119', stopId_KMB: '', route: '973' , company: 'CTB'}
];

/* const busList_b = [
    { stopId_CTB: '001007', stopId_KMB: '', route: '40' , company: 'CTB'},
    { stopId_CTB: '001007', stopId_KMB: '', route: '40M' , company: 'CTB'},
    { stopId_CTB: '001007', stopId_KMB: '', route: '23' , company: 'CTB'},
    { stopId_CTB: '001007', stopId_KMB: '6D9F5C463D12461B', route: '103' , company: 'CHT'} 
]; */

async function fetchRouteEta({ stopId_CTB, stopId_KMB, route, company }) {
    switch (company) {
        case 'CTB':
            try {
                const apiUrl = `https://rt.data.gov.hk/v1/transport/citybus-nwfb/eta/CTB/${stopId_CTB}/${route}`;
                const response = await fetch(apiUrl);
                const data = await response.json();

                const dest = data.data[0]?.dest_en || `<span style="color: grey;">No Service</span>`;
                const raw1 = data.data[0]?.eta || null;
                const raw2 = data.data[1]?.eta || null;
                const raw3 = data.data[2]?.eta || null;
                const formatEta = raw => {
                  const time = raw?.split('T')[1]?.substring(0, 8);
                  return time ? `${time.substring(0, 6)}<span class="seconds">${time.substring(6)}</span>` : '\u200E';
                };
                const eta1 = formatEta(raw1);
                const eta2 = formatEta(raw2);
                const eta3 = formatEta(raw3);
                const min1 = calculateMins(raw1);
                const min2 = calculateMins(raw2);
                const min3 = calculateMins(raw3);

                return { route, dest, etas: [eta1, eta2, eta3], mins: [min1, min2, min3], rawEtas: [raw1, raw2, raw3], company };
            } catch (error) {
                return { route, dest: 'Error', etas: ['\u200E', '\u200E', '\u200E'], mins: ['\u200E', '\u200E', '\u200E'], company };
            }

        case 'CHT':
            try {
                const apiUrl = `https://rt.data.gov.hk/v1/transport/citybus-nwfb/eta/CTB/${stopId_CTB}/${route}`;
                const response = await fetch(apiUrl);
                const data = await response.json();
                const ctbList = data.data || [];

                let kmbList = [];
                const hasKmbCycle = ctbList.some(item => item?.rmk_en === 'KMB Cycle');

                if (hasKmbCycle && stopId_KMB) {
                    const kmbUrl = `https://data.etabus.gov.hk/v1/transport/kmb/eta/${stopId_KMB}/${route}/1`;
                    const kmbResponse = await fetch(kmbUrl);
                    const kmbData = await kmbResponse.json();
                    kmbList = kmbData.data || [];
                }

                let kmbIndex = 0;
                const combinedRaw = [];
                let mainDest = null;

                for (let i = 0; i < 3; i++) {
                    const ctbItem = ctbList[i];
                    if (ctbItem?.rmk_en === 'KMB Cycle') {
                        const kmbItem = kmbList[kmbIndex++];
                        if (!mainDest && kmbItem?.dest_en) mainDest = kmbItem.dest_en;
                        combinedRaw.push(kmbItem?.eta || null);
                    } else if (ctbItem) {
                        if (!mainDest && ctbItem?.dest_en) mainDest = ctbItem.dest_en;
                        combinedRaw.push(ctbItem?.eta || null);
                    } else {
                        combinedRaw.push(null);
                    }
                }

                const dest = capital(mainDest) || `<span style="color: grey;">No Service</span>`;
                const [raw1, raw2, raw3] = combinedRaw;

                const eta1 = raw1?.split('T')[1]?.substring(0, 5) || '\u200E';
                const eta2 = raw2?.split('T')[1]?.substring(0, 5) || '\u200E';
                const eta3 = raw3?.split('T')[1]?.substring(0, 5) || '\u200E';
                const min1 = calculateMins(raw1);
                const min2 = calculateMins(raw2);
                const min3 = calculateMins(raw3);

                return { route, dest, etas: [eta1, eta2, eta3], mins: [min1, min2, min3], rawEtas: [raw1, raw2, raw3], company };
            } catch (error) {
                return { route, dest: 'Error', etas: ['\u200E', '\u200E', '\u200E'], mins: ['\u200E', '\u200E', '\u200E'], company};
            }
    }
}

async function updateAllBusEtas() {
  const results_a = await Promise.all(busList_a.map(fetchRouteEta));
//  const results_b = await Promise.all(busList_b.map(fetchRouteEta));
  
  const container_a = document.getElementById('bus_rows_a');
//  const container_b = document.getElementById('bus_rows_b');
  
  container_a.innerHTML = results_a.map(item => `
    <div class="row_container">
      <div class="Route">
        <span class="Route_text ${item.company}">${item.route}</span>
      </div>
      <div class="Dest">${item.dest}</div>
      <div class="ETA">
        <div class="ETA_item1">
            <div>${item.etas[0]}</div>
            <div class="Mins" data-eta="${item.rawEtas[0] || ''}">${item.mins[0]}</div>
        </div>
        <div class="ETA_item2">
            <div>${item.etas[1]}</div>
            <div class="Mins" data-eta="${item.rawEtas[1] || ''}">${item.mins[1]}</div>
        </div>
        <div class="ETA_item3">
            <div>${item.etas[2]}</div>
            <div class="Mins" data-eta="${item.rawEtas[2] || ''}">${item.mins[2]}</div>
        </div>
      </div>
    </div>
  `).join('');

/*    container_b.innerHTML = results_b.map(item => `
    <div class="row_container">
      <div class="Route">
        <span class="Route_text ${item.company}">${item.route}</span>
      </div>
      <div class="Dest">${item.dest}</div>
      <div class="ETA">
        <div class="ETA_item1">
            <div>${item.etas[0]}</div>
            <div class="Mins">${item.mins[0]}</div>
        </div>
        <div class="ETA_item2">
            <div>${item.etas[1]}</div>
            <div class="Mins">${item.mins[1]}</div>
        </div>
        <div class="ETA_item3">
            <div>${item.etas[2]}</div>
            <div class="Mins">${item.mins[2]}</div>
        </div>
      </div>
    </div>
  `).join(''); */
}

updateAllBusEtas();
setInterval(updateAllBusEtas, 10000);

function updateDisplayedMins() {
  document.querySelectorAll('.Mins[data-eta]').forEach(element => {
    element.textContent = calculateMins(element.dataset.eta);
  });
}

setInterval(updateDisplayedMins, 1000);

/* MTR */
async function getMTREta() {
    const line = 'ISL';
    const sta = 'SYP';
    const apiUrl = `https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=${line}&sta=${sta}`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    const length_d = data.data['ISL-SYP'].DOWN.length;
    const train_d = [];
    for (let i = 0; i < length_d; i++) {
        const ttnt = parseInt(data.data['ISL-SYP'].DOWN[i].ttnt, 10);
        train_d[i] = ttnt <= 0 ? '<b>Departing</b>' : (ttnt === 1 ? '<b>Arriving</b>' : `<b>${ttnt}</b> mins`);
    }
    const length_u = data.data['ISL-SYP'].UP.length;
    const train_u = [];
    for (let i = 0; i < length_u; i++) {
        const ttnt = parseInt(data.data['ISL-SYP'].UP[i].ttnt, 10);
        train_u[i] = ttnt <= 0 ? '<b>Departing</b>' : (ttnt === 1 ? '<b>Arriving</b>' : `<b>${ttnt}</b> mins`);
    }
    console.log({ data, train_d, train_u });
    return { train_d, train_u };
}

async function updateAllMTREtas() {
  const { train_d, train_u } = await getMTREta();

  const DOWN_text = document.getElementById('DOWN_text');
  const UP_text = document.getElementById('UP_text');

  DOWN_text.innerHTML = train_d.join(', ');
  UP_text.innerHTML = train_u.join(', ');
}

updateAllMTREtas();
setInterval(updateAllMTREtas, 10000);

// Date

function updateDateTime() {
  const d = new Date();

  // 1. Format Time (HH:MM:SS)
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const seconds = d.getSeconds().toString().padStart(2, '0');
  const formattedTime = `${hours}:${minutes}:${seconds}`;

  // 2. Format Date (DD/MM/YY)
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed
  const year = d.getFullYear().toString().slice(-2); // Extracts last two digits

  // 3. Get Weekday
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekday = weekdays[d.getDay()];

  const formattedDate = `${day}/${month}/${year} ${weekday}`;

  // Update elements in HTML
  const timeEl = document.getElementById('time_text');
  const dateEl = document.getElementById('date_text');

  if (timeEl) timeEl.textContent = formattedTime;
  if (dateEl) dateEl.textContent = formattedDate;
}

// Run immediately, then update every second
updateDateTime();
setInterval(updateDateTime, 1000);