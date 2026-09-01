(() => {
  const STORAGE = {
    todos: "organizer.todos.v1",
    agenda: "organizer.agenda.v1",
    notes: "organizer.notes.v1",
    quote: "organizer.quote.v1",
    settings: "organizer.settings.v1"
  };

  const defaultTodos = [
    { id: crypto.randomUUID(), text: "Thesis Defense", done: false },
    { id: crypto.randomUUID(), text: "Practice French", done: false },
    { id: crypto.randomUUID(), text: "Job application (x50)", done: false },
    { id: crypto.randomUUID(), text: "Learn dbt × Databricks", done: false },
    { id: crypto.randomUUID(), text: "Journaling app", done: false }
  ];

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const defaultAgenda = [
    { id: crypto.randomUUID(), date: `${y}-${String(m+1).padStart(2,"0")}-02`, text: "Thesis Practice / Independence Day" },
    { id: crypto.randomUUID(), date: `${y}-${String(m+1).padStart(2,"0")}-05`, text: "Festival des Lumières" },
    { id: crypto.randomUUID(), date: `${y}-${String(m+1).padStart(2,"0")}-12`, text: "Mindmapping Conference" },
    { id: crypto.randomUUID(), date: `${y}-${String(m+1).padStart(2,"0")}-19`, text: "Journée du patrimoine" },
    { id: crypto.randomUUID(), date: `${y}-${String(m+1).padStart(2,"0")}-25`, text: "Thesis Defense" }
  ];

  const load = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  let todos = load(STORAGE.todos, defaultTodos);
  let agenda = load(STORAGE.agenda, defaultAgenda);
  let settings = load(STORAGE.settings, {
    weatherLocation: "Clermont-Ferrand",
    temperatureUnit: "celsius"
  });

  // Currently selected agenda date in YYYY-MM-DD format.
  let selectedAgendaDate = null;

  const $ = (id) => document.getElementById(id);

  function localDateKey(date = new Date()) {
    return (
      `${date.getFullYear()}-` +
      `${String(date.getMonth() + 1).padStart(2, "0")}-` +
      `${String(date.getDate()).padStart(2, "0")}`
    );
  }



  function renderCalendar() {
    const d = new Date();
    const year = d.getFullYear();
    const month = d.getMonth();

    $("calendarMonth").textContent = d.toLocaleDateString(undefined, { month: "long" });

    const grid = $("calendarGrid");
    grid.innerHTML = "";

    const dayNames = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
    dayNames.forEach((name, i) => {
      const div = document.createElement("div");
      div.className = "calendar-cell calendar-head" + (i >= 5 ? " weekend" : "");
      div.textContent = name;
      grid.appendChild(div);
    });

    const first = new Date(year, month, 1);
    const mondayBasedStart = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();

    for (let i = 0; i < 35; i++) {
      const cell = document.createElement("div");
      cell.className = "calendar-cell calendar-day";

      let number;
      let cellMonth = month;
      if (i < mondayBasedStart) {
        number = prevDays - mondayBasedStart + i + 1;
        cell.classList.add("other-month");
        cellMonth = month - 1;
      } else if (i >= mondayBasedStart + daysInMonth) {
        number = i - (mondayBasedStart + daysInMonth) + 1;
        cell.classList.add("other-month");
        cellMonth = month + 1;
      } else {
        number = i - mondayBasedStart + 1;
      }

      const weekday = i % 7;
      if (weekday >= 5) cell.classList.add("weekend");

      // Store the full date on each calendar cell so Agenda items can target it.
      const cellDate = new Date(year, cellMonth, number);
      const dateKey =
        `${cellDate.getFullYear()}-` +
        `${String(cellDate.getMonth() + 1).padStart(2, "0")}-` +
        `${String(cellDate.getDate()).padStart(2, "0")}`;
      cell.dataset.date = dateKey;

      if (
        number === d.getDate() &&
        cellMonth === month
      ) {
        cell.classList.add("today");
      }

      if (selectedAgendaDate === dateKey) {
        cell.classList.add("agenda-selected");
      }

      cell.textContent = number;
      grid.appendChild(cell);
    }
  }

  function highlightCalendarDate(date) {
    // Clicking the same date twice removes the selection.
    selectedAgendaDate = selectedAgendaDate === date ? null : date;

    document
      .querySelectorAll(".calendar-day.agenda-selected")
      .forEach(cell => cell.classList.remove("agenda-selected"));

    if (!selectedAgendaDate) return;

    const cell = document.querySelector(
      `.calendar-day[data-date="${selectedAgendaDate}"]`
    );

    if (cell) {
      cell.classList.add("agenda-selected");
    }
  }

  function renderTodos() {
    const list = $("todoList");
    list.innerHTML = "";
    todos.forEach(todo => {
      const row = document.createElement("div");
      row.className = "todo-item";

      const check = document.createElement("input");
      check.type = "checkbox";
      check.className = "todo-check";
      check.checked = !!todo.done;
      check.setAttribute("aria-label", `Mark ${todo.text} complete`);
      check.addEventListener("change", () => {
        todo.done = check.checked;
        save(STORAGE.todos, todos);
        renderTodos();
      });

      const text = document.createElement("span");
      text.className = "todo-text" + (todo.done ? " done" : "");
      text.textContent = todo.text;

      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Delete ${todo.text}`);
      remove.addEventListener("click", () => {
        todos = todos.filter(t => t.id !== todo.id);
        save(STORAGE.todos, todos);
        renderTodos();
      });

      row.append(check, text, remove);
      list.appendChild(row);
    });
  }

  function renderAgenda() {
    const list = $("agendaList");
    list.innerHTML = "";

    agenda
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach(item => {
        const row = document.createElement("div");
        row.className = "agenda-item";

        const badge = document.createElement("button");
        badge.type = "button";
        badge.className = "agenda-badge";
        const date = new Date(item.date + "T12:00:00");
        badge.textContent = date.getDate();

        if (item.date === localDateKey()) {
          badge.classList.add("agenda-today");
        }
        badge.setAttribute("aria-label", `Highlight ${item.date} in calendar`);
        badge.addEventListener("click", () => {
          highlightCalendarDate(item.date);
        });

        const text = document.createElement("span");
        text.textContent = item.text;

        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "×";
        remove.setAttribute("aria-label", `Delete ${item.text}`);
        remove.addEventListener("click", () => {
          agenda = agenda.filter(a => a.id !== item.id);
          save(STORAGE.agenda, agenda);
          renderAgenda();
        });

        row.append(badge, text, remove);
        list.appendChild(row);
      });
  }

  function setupForms() {
    $("todoForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const input = $("todoText");
      const text = input.value.trim();
      if (!text) return;
      todos.push({ id: crypto.randomUUID(), text, done: false });
      save(STORAGE.todos, todos);
      input.value = "";
      renderTodos();
    });

    $("agendaDate").valueAsDate = new Date();
    $("agendaForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const date = $("agendaDate").value;
      const text = $("agendaText").value.trim();
      if (!date || !text) return;
      agenda.push({ id: crypto.randomUUID(), date, text });
      save(STORAGE.agenda, agenda);
      $("agendaText").value = "";
      renderAgenda();
    });

    const notes = $("quickNotes");
    notes.value = localStorage.getItem(STORAGE.notes) || "";
    let saveTimer;
    notes.addEventListener("input", () => {
      $("saveStatus").textContent = "Saving…";
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        localStorage.setItem(STORAGE.notes, notes.value);
        $("saveStatus").textContent = "Saved locally";
      }, 350);
    });

    $("clearNotes").addEventListener("click", () => {
      if (!confirm("Clear the quick note?")) return;
      notes.value = "";
      localStorage.setItem(STORAGE.notes, "");
      $("saveStatus").textContent = "Saved locally";
    });

  }

  async function geocodeLocation(name) {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", name);
    url.searchParams.set("count", "1");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");

    const response = await fetch(url);
    if (!response.ok) throw new Error("Location lookup failed");
    const data = await response.json();
    if (!data.results?.length) throw new Error("Location not found");
    return data.results[0];
  }


  function weatherCodeToIcon(code, isDay = 1) {
    const day = Number(isDay) === 1;

    if (code === 0) return day ? "icons/day-sunny.svg" : "icons/night-clear.svg";
    if (code === 1 || code === 2) return day ? "icons/day-cloudy.svg" : "icons/night-cloudy.svg";
    if (code === 3) return "icons/cloudy.svg";
    if (code === 45 || code === 48) return "icons/cloudy.svg";
    if (code >= 51 && code <= 57) return day ? "icons/day-showers.svg" : "icons/night-rain.svg";
    if (code >= 61 && code <= 67) return day ? "icons/day-rain.svg" : "icons/night-rain.svg";
    if (code >= 71 && code <= 77) return "icons/day-snow.svg";
    if (code >= 80 && code <= 82) return day ? "icons/day-showers.svg" : "icons/night-rain.svg";
    if (code >= 85 && code <= 86) return "icons/day-snow.svg";
    if (code >= 95) return day ? "icons/day-thunderstorm.svg" : "icons/thunderstorm.svg";

    return day ? "icons/day-cloudy.svg" : "icons/night-cloudy.svg";
  }

  function weatherCodeToText(code) {
    const map = new Map([
      [0, "Clear"],
      [1, "Mostly clear"],
      [2, "Partly cloudy"],
      [3, "Cloudy"],
      [45, "Fog"],
      [48, "Rime fog"],
      [51, "Light drizzle"],
      [53, "Drizzle"],
      [55, "Heavy drizzle"],
      [61, "Light rain"],
      [63, "Rain"],
      [65, "Heavy rain"],
      [71, "Light snow"],
      [73, "Snow"],
      [75, "Heavy snow"],
      [80, "Rain showers"],
      [81, "Showers"],
      [82, "Heavy showers"],
      [95, "Thunderstorm"]
    ]);
    return map.get(code) || "Weather";
  }

  async function updateWeather() {
    const iconEl = $("weatherIcon");
    const tempEl = $("weatherTemp");
    const cityEl = $("weatherCity");

    iconEl.src = "icons/cloudy.svg";
    tempEl.textContent = "--°";
    cityEl.textContent = "Weather loading…";

    try {
      const place = await geocodeLocation(settings.weatherLocation);

      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", place.latitude);
      url.searchParams.set("longitude", place.longitude);
      url.searchParams.set("current", "temperature_2m,weather_code,is_day");
      url.searchParams.set("temperature_unit", settings.temperatureUnit);
      url.searchParams.set("timezone", "auto");

      const response = await fetch(url);
      if (!response.ok) throw new Error("Weather request failed");

      const data = await response.json();
      const temp = Math.round(data.current.temperature_2m);
      const unit = settings.temperatureUnit === "fahrenheit" ? "°F" : "°C";
      const weatherCode = data.current.weather_code;
      const isDay = data.current.is_day;

      iconEl.src = weatherCodeToIcon(weatherCode, isDay);
      tempEl.textContent = `${temp}${unit}`;
      cityEl.textContent = place.name;
    } catch (err) {
      iconEl.src = "icons/cloudy.svg";
      tempEl.textContent = "--°";
      cityEl.textContent = "Weather unavailable";
      console.error(err);
    }
  }

  function setupSettings() {
    const dialog = $("settingsDialog");
    $("weatherLocation").value = settings.weatherLocation;
    $("temperatureUnit").value = settings.temperatureUnit;

    $("settingsButton").addEventListener("click", () => dialog.showModal());
    $("cancelSettings").addEventListener("click", () => dialog.close());

    $("settingsForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const location = $("weatherLocation").value.trim();
      if (location) settings.weatherLocation = location;
      settings.temperatureUnit = $("temperatureUnit").value;
      save(STORAGE.settings, settings);
      dialog.close();
      updateWeather();
    });
  }




  function improveFormInteraction() {
    document
      .querySelectorAll('input[type="text"], textarea, select')
      .forEach((el) => {
        el.addEventListener("pointerdown", () => {
          try {
            el.focus({ preventScroll: true });
          } catch {
            el.focus();
          }
        });
      });

    document
      .querySelectorAll('input[type="date"]')
      .forEach((el) => {
        el.addEventListener("pointerdown", () => {
          try {
            el.focus({ preventScroll: true });
          } catch {
            el.focus();
          }

          if (typeof el.showPicker === "function") {
            try {
              el.showPicker();
            } catch {}
          }
        });
      });
  }


  function createCustomScrollbar(scrollElement) {
    const parent = scrollElement.parentElement;
    if (!parent) return;

    const scrollKey =
      scrollElement.id ||
      Array.from(scrollElement.classList).join("-") ||
      "scroll-area";

    if (parent.querySelector(`.custom-scrollbar[data-scroll-for="${scrollKey}"]`)) {
      return;
    }

    const track = document.createElement("div");
    track.className = "custom-scrollbar";
    track.dataset.scrollFor = scrollKey;

    const thumb = document.createElement("div");
    thumb.className = "custom-scrollbar-thumb";

    track.appendChild(thumb);
    parent.appendChild(track);

    function updateTrackGeometry() {
      const parentRect = parent.getBoundingClientRect();
      const scrollRect = scrollElement.getBoundingClientRect();

      track.style.top = `${scrollRect.top - parentRect.top}px`;
      track.style.height = `${scrollRect.height}px`;
    }

    function updateThumb() {
      updateTrackGeometry();

      const visibleHeight = scrollElement.clientHeight;
      const totalHeight = scrollElement.scrollHeight;

      if (totalHeight <= visibleHeight + 1) {
        track.classList.add("is-hidden");
        return;
      }

      track.classList.remove("is-hidden");

      const trackHeight = track.clientHeight;
      const ratio = visibleHeight / totalHeight;
      const thumbHeight = Math.max(22, trackHeight * ratio);

      const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
      const maxScroll = Math.max(1, totalHeight - visibleHeight);
      const scrollRatio = scrollElement.scrollTop / maxScroll;
      const thumbTop = maxThumbTop * scrollRatio;

      thumb.style.height = `${thumbHeight}px`;
      thumb.style.transform = `translateY(${thumbTop}px)`;
    }

    let dragging = false;
    let dragStartY = 0;
    let dragStartScroll = 0;

    thumb.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();

      dragging = true;
      dragStartY = event.clientY;
      dragStartScroll = scrollElement.scrollTop;
      thumb.classList.add("dragging");

      try {
        thumb.setPointerCapture(event.pointerId);
      } catch {}
    });

    thumb.addEventListener("pointermove", (event) => {
      if (!dragging) return;

      event.preventDefault();
      event.stopPropagation();

      const movableDistance = Math.max(
        1,
        track.clientHeight - thumb.offsetHeight
      );

      const scrollableDistance = Math.max(
        0,
        scrollElement.scrollHeight - scrollElement.clientHeight
      );

      const mouseMovement = event.clientY - dragStartY;
      const scrollMovement =
        mouseMovement * (scrollableDistance / movableDistance);

      scrollElement.scrollTop = dragStartScroll + scrollMovement;
    });

    function finishDragging(event) {
      if (!dragging) return;

      dragging = false;
      thumb.classList.remove("dragging");

      try {
        thumb.releasePointerCapture(event.pointerId);
      } catch {}
    }

    thumb.addEventListener("pointerup", finishDragging);
    thumb.addEventListener("pointercancel", finishDragging);

    track.addEventListener("pointerdown", (event) => {
      if (event.target === thumb) return;

      event.preventDefault();
      event.stopPropagation();

      const rect = track.getBoundingClientRect();
      const clickY = event.clientY - rect.top;
      const thumbHeight = thumb.offsetHeight;

      const maxThumbTop = Math.max(
        1,
        track.clientHeight - thumbHeight
      );

      const desiredThumbTop = Math.max(
        0,
        Math.min(maxThumbTop, clickY - thumbHeight / 2)
      );

      const ratio = desiredThumbTop / maxThumbTop;

      scrollElement.scrollTop =
        ratio *
        (scrollElement.scrollHeight - scrollElement.clientHeight);
    });

    scrollElement.addEventListener(
      "wheel",
      (event) => {
        if (scrollElement.scrollHeight > scrollElement.clientHeight) {
          scrollElement.scrollTop += event.deltaY;
          event.preventDefault();
          event.stopPropagation();
        }
      },
      { passive: false }
    );

    scrollElement.addEventListener("scroll", updateThumb);
    window.addEventListener("resize", updateThumb);

    const observer = new MutationObserver(updateThumb);
    observer.observe(scrollElement, {
      childList: true,
      subtree: true,
      characterData: true
    });

    scrollElement.addEventListener("input", updateThumb);
    requestAnimationFrame(updateThumb);
  }


  function enableDragScrolling(scrollElement) {
    scrollElement.classList.add("drag-scroll-enabled");

    let pointerId = null;
    let startY = 0;
    let startScroll = 0;

    scrollElement.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button, input, textarea, select, a")) {
        return;
      }

      pointerId = event.pointerId;
      startY = event.clientY;
      startScroll = scrollElement.scrollTop;

      try {
        scrollElement.setPointerCapture(pointerId);
      } catch {}
    });

    scrollElement.addEventListener("pointermove", (event) => {
      if (pointerId !== event.pointerId) return;

      const movement = event.clientY - startY;

      if (Math.abs(movement) > 3) {
        scrollElement.classList.add("is-dragging");
        scrollElement.scrollTop = startScroll - movement;
        event.preventDefault();
      }
    });

    function endDrag(event) {
      if (pointerId !== event.pointerId) return;

      scrollElement.classList.remove("is-dragging");

      try {
        scrollElement.releasePointerCapture(pointerId);
      } catch {}

      pointerId = null;
    }

    scrollElement.addEventListener("pointerup", endDrag);
    scrollElement.addEventListener("pointercancel", endDrag);
  }


  function setupScrollInteraction() {
    const agendaList = $("agendaList");
    const todoList = $("todoList");
    const notes = $("quickNotes");

    [agendaList, todoList, notes].forEach((element) => {
      if (!element) return;
      createCustomScrollbar(element);
    });

    if (agendaList) enableDragScrolling(agendaList);
    if (todoList) enableDragScrolling(todoList);
  }

  function init() {
    renderCalendar();
    renderTodos();
    renderAgenda();
    setupForms();
    setupSettings();
    improveFormInteraction();
    setupScrollInteraction();
    updateWeather();

    setInterval(() => {
      renderCalendar();
      renderAgenda();
    }, 60_000);

    setInterval(updateWeather, 30 * 60_000);
  }

  init();
})();
