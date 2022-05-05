'use strict';

// prettier-ignore

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

//geo location api
class Workout {
  date = new Date();
  //create object id
  id = Date.now() + ''.slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }
  _setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
    //console.log(this.description);
  }
}
//running class
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace(); //calculate the pace
    this._setDescription();
  }
  calcPace() {
    //min/km
    this.pace = this.duration / this.distance;
  }
}
//cycling class
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  //calc speed method
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
  }
}

const run1 = new Running([39, -12], 5.2, 24, 178);
const cycling1 = new Cycling([39, -12], 27, 95, 523);
//console.log(run1, cycling1);

///architecture
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    this._getPosition();
    //get data from local storage
    this._getLocalStorage()
    //displaying a map using leaflet - 3rd party lib
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }
  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('could not get your position');
        }
      );
  }

  //loadmap
  _loadMap(position) {
    // console.log(position);
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    //console.log(`https://www.google.com/maps/@${latitude},${longitude}`);
    const coords = [latitude, longitude];
    //load map using the coords
    this.#map = L.map('map').setView(coords, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));
    //bind 'this' to the app object

    //render markers after refresh
    this.#workouts.forEach(work => {
        this._renderWorkoutMarker(work)
    })
  }
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _hideForm() {
    //clear input fields
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  //toggle candence and elevation
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _newWorkout(e) {
    //validation function
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    e.preventDefault();
    //get data from form
    const type = inputType.value;
    //+input converts string to number
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    //check if data is valid
    //create running object if type of workout is running
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // check if distance if positive number
      //   if (!Number.isFinite(distance) || !Number.isFinite(duration) ||
      //   !Number.isFinite(cadence))
      if (
        !validInputs(distance, cadence, duration) ||
        !allPositive(distance, cadence, duration)
      )
        return alert('inputs have to be positive numbers');
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    //create cycling object if type of workout is cycling
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      //validate cycling inputs
      if (
        !validInputs(distance, elevation, duration) ||
        !allPositive(distance, duration) //check if numbers are positive
      )
        return alert('inputs have to be positive numbers');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    // push to workout array
    this.#workouts.push(workout);
    //console.log({ workout });

    //render workout area on the map as a marker
    this._renderWorkoutMarker(workout);
    this._renderWorkout(workout);
    //hide form
    this._hideForm();

    //set local storage to all workouts
    this._setLocalStorage()
  }
  _renderWorkoutMarker(workout) {
    //render workout area on the map as a marker
    //console.log(mapEvent);

    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          autoClose: false,
          maxwidth: 250,
          minWidth: 100,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup(); //creates popup and adds it to the map
  }
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === `running`)
      html += `
    <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
     `;

    if (workout.type === 'cycling')
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
          
          `;
    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    //console.log(workoutEl);
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    //console.log(workout);
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }
 _setLocalStorage() {
   localStorage.setItem('workouts', JSON.stringify(this.#workouts))
  }
  _getLocalStorage(){
     const data = JSON.parse(localStorage.getItem('workouts'))
    if(!data)return //guard clause
    this.#workouts = data //render workouts
    this.#workouts.forEach(work => {
        this._renderWorkout(work)
       // this._renderWorkoutMarker(work)
    })
     ////console.log({data})

  }
  //to reset the page and delete data
  reset(){
      localStorage.removeItem('workouts')
      location.reload()
  }
}

const app = new App();
