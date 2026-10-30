/* PackWise sample data.
   The prototype uses rule-based mock recommendations (no live AI model).
   Each recommended item lists keywords used to match it against the user's closet. */

const ICONS = {
  top: 'M8.5 3 4 5.5l1.8 4 2.2-.9V21h8V8.6l2.2.9 1.8-4L15.5 3c-.6 1.4-1.9 2.3-3.5 2.3S9.1 4.4 8.5 3Z',
  bottom: 'M7 3h10l1.2 18h-4.4L12 10l-1.8 11H5.8L7 3Z',
  shoe: 'M3 18v-5.5l4.5-.8 3-3.7 2.3 1.2.7 3.3 6.3 2.2c1.3.5 1.7 1.6 1.7 2.8V18H3Z',
  layer: 'M9 3 4 5.5V21h5v-9M15 3l5 2.5V21h-5v-9M9 3l3 3 3-3M12 6v15',
  hat: 'M3 17h18M6.5 17c0-5.5 2.4-9 5.5-9s5.5 3.5 5.5 9',
  glasses: 'M3 12.5a3.5 3.5 0 1 0 7 0 3.5 3.5 0 1 0-7 0M14 12.5a3.5 3.5 0 1 0 7 0 3.5 3.5 0 1 0-7 0M10 12.5h4',
  bag: 'M5 9h14l-1 12H6L5 9ZM9 9V7a3 3 0 0 1 6 0v2',
  bottle: 'M10 2.5h4V5l2 3v13.5H8V8l2-3V2.5ZM8 12h8',
  device: 'M7 2.5h10v19H7zM11 18.5h2',
  sun: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 1 0 0-7M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8',
  food: 'M12 7c-3-2-7 0-7 5s3 9 5 9c1 0 1.5-.5 2-.5s1 .5 2 .5c2 0 5-4 5-9s-4-7-7-5ZM12 7c0-2 1-4 3-4',
  kit: 'M3.5 7h17v13h-17zM9 7V4.5h6V7M12 10.5v6M9 13.5h6',
  tent: 'M2.5 20h19L12 4 2.5 20ZM9 20l3-6 3 6',
  map: 'M3 6l6-2.5 6 2.5 6-2.5v14.5l-6 2.5-6-2.5-6 2.5V6ZM9 3.5v14.5M15 6v14.5',
  light: 'M12 9a4 4 0 1 0 0 8 4 4 0 1 0 0-8M3 13h5M16 13h5M12 3v3M6 6l2 2M18 6l-2 2',
  item: 'M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9ZM4 7.5l8 4.5 8-4.5M12 12v9',
  camera: 'M3 8h4l1.5-2.5h7L17 8h4v12H3zM12 10.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 1 0 0-7',
  mountain: 'M2 20 9 8l4 6 3-4 6 10H2Z',
  wave: 'M2 16c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M2 20c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M7 10a5 5 0 0 1 10 0H7Z',
  music: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0M20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  city: 'M3 21V9l5-3v15M8 21V3h8v18M16 21V10h5v11M2 21h20',
  car: 'M3 16v-4l2-5h14l2 5v4H3ZM3 12h18M7 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M17 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3',
  basket: 'M3 10h18l-2 10H5L3 10ZM7 10l3-6M17 10l-3-6M8 14v3M12 14v3M16 14v3',
  paddle: 'M3 15c3 2.5 15 2.5 18 0M7 15 17 5M15 3l4 4',
  cocktail: 'M5 4h14l-7 8-7-8ZM12 12v8M8 20h8M7 7h10',
  dining: 'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2.5 2-2.5 7 0 9v9',
  brush: 'M14 4l6 6-9 9H5v-6l9-9ZM12 6l6 6',
  ferris: 'M12 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14M12 4v14M5 11h14M7 6l10 10M17 6 7 16M8 21l4-10 4 10',
  snow: 'M12 2v20M3.5 7l17 10M3.5 17l17-10M9 4l3 2.5L15 4M9 20l3-2.5 3 2.5',
  ring: 'M12 9a6 6 0 1 0 0 12 6 6 0 0 0 0-12M9 3h6l-3 6-3-6Z',
  trophy: 'M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8',
  dumbbell: 'M3 10v4M6 7.5v9M18 7.5v9M21 10v4M6 12h12',
  bed: 'M3 19V6M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-7v6M7 11.5a1.5 1.5 0 1 0 0-.01',
  bike: 'M5.5 21a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M18.5 21a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M5.5 17.5 9 10h7l2.5 7.5M9 10l3 7.5M15 6.5h2.5L16 10',
  spark: 'M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3',
  towel: 'M5 4h14v16H5zM5 9h14M9 4v16',
  rain: 'M7 14a4 4 0 1 1 1-7.9A5 5 0 0 1 17.6 8 3 3 0 0 1 17 14H7ZM8 17l-1 3M12 17l-1 3M16 17l-1 3',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6 6 18',
  back: 'M15 5l-7 7 7 7',
  upload: 'M12 16V4M7 9l5-5 5 5M4 16v4h16v-4',
  suitcase: 'M4 8h16v12H4zM9 8V5h6v3M8 8v12M16 8v12',
  backpack: 'M9 5.5V4a3 3 0 0 1 6 0v1.5M6 10a4.5 4.5 0 0 1 4.5-4.5h3A4.5 4.5 0 0 1 18 10v11H6V10ZM9 14h6v4H9zM6 13H4.5M18 13h1.5',
  tote: 'M4.5 9h15l-1.5 12H6L4.5 9ZM8.5 9V7a3.5 3.5 0 0 1 7 0v2',
  roller: 'M7 7.5h10V19H7zM10 7.5V3h4v4.5M9 19v2M15 19v2M10.5 10.5v5.5M13.5 10.5v5.5',
  duffel: 'M3 12a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v6H3v-6ZM8.5 8V6.5h7V8M3 13.5h18M11 11h2',
  checked: 'M5.5 6.5h13v13.5h-13zM9.5 6.5V3.5h5v3M8 20v1.5M16 20v1.5M5.5 12h13',
  checkedL: 'M4.5 5h15v16h-15zM9 5V2h6v3M7 21v1.5M17 21v1.5M9 9v8M15 9v8',
  minus: 'M5 12h14',
  therm: 'M10 4a2 2 0 0 1 4 0v10a4 4 0 1 1-4 0V4ZM12 9v7',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
};

// Temperatures are stored in °F; show both units everywhere.
const toC = f => Math.round((f - 32) * 5 / 9);
const tF = f => `${f}°F (${toC(f)}°C)`;

// O(name, keywords, icon, kind, why)  kind: practical | style | rain
const O = (name, kw, icon, kind, why) => ({ name, kw, icon, kind, why });
// I(name, keywords, icon, essential, why, alt)
const I = (name, kw, icon, essential, why, alt) => ({ name, kw, icon, essential, why, alt });

const COMMON = {
  phone: I('Phone', ['phone'], 'device', true, 'Maps, tickets, and emergencies.'),
  charger: I('Portable charger', ['charger', 'power bank', 'battery pack'], 'device', false, 'Photos and maps drain your battery faster than usual.', 'Turn on low-power mode and download maps offline.'),
  id: I('ID and card', ['id', 'wallet', 'card'], 'item', true, 'Needed for parking, entry, or emergencies.'),
  sunscreen: I('Sunscreen', ['sunscreen', 'spf'], 'sun', true, 'UV is strong even on cloudy days.', 'A sun hat and long sleeves cover most of you.'),
  water: I('Water bottle', ['water bottle', 'bottle', 'hydro flask', 'nalgene'], 'bottle', true, 'Plan on about half a litre per hour of activity.', 'A rinsed-out disposable bottle works for one trip.'),
  snacks: I('Snacks', ['snack', 'granola', 'trail mix'], 'food', true, 'Keeps your energy steady between meals.'),
  sanitizer: I('Hand sanitizer', ['sanitizer'], 'item', false, 'Useful where there are no sinks.'),
  lipbalm: I('Lip balm with SPF', ['lip balm', 'chapstick'], 'sun', false, 'Sun and wind dry lips quickly.'),
  toiletries: I('Toiletry kit', ['toiletr', 'toothbrush', 'dopp'], 'item', true, 'For overnight stays.'),
  sleepwear: I('Sleepwear', ['pajama', 'sleepwear', 'sleep shirt'], 'top', false, 'Something comfortable for the night.'),
};

const ACTIVITIES = {
  hiking: {
    label: 'Hiking', icon: 'mountain',
    weather: { temp: 17, sky: 'Partly cloudy', note: 'Cool start, mild by midday' },
    rainWeather: { temp: 12, sky: 'Light rain', note: 'Showers through the afternoon' },
    slots: {
      Top: [
        O('Moisture-wicking tee', ['wicking', 'athletic tee', 'dri-fit', 'running shirt', 'sport tee'], 'top', 'practical', 'Dries fast, so you won’t get chilled when you stop for a break.'),
        O('Fitted graphic tee', ['graphic tee', 't-shirt', 'cotton tee', 'white tee', 'black tee'], 'top', 'style', 'Your everyday look. Cotton is fine for a short, easy trail.'),
      ],
      Bottom: [
        O('Hiking pants', ['hiking pants', 'trail pants', 'convertible pants', 'cargo pants'], 'bottom', 'practical', 'Protects your legs from brush and ticks.'),
        O('Black leggings', ['leggings'], 'bottom', 'style', 'Stretchy and sleek. They move well on climbs.'),
      ],
      Footwear: [
        O('Trail runners', ['trail runner', 'trail shoe', 'hiking shoe'], 'shoe', 'practical', 'Grip for loose dirt without the weight of boots.'),
        O('Chunky trail sneakers', ['sneaker'], 'shoe', 'style', 'Fine for groomed paths. Switch to trail runners if the route is rocky.'),
      ],
      Layer: [
        O('Fleece pullover', ['fleece', 'quarter zip', 'pullover'], 'layer', 'practical', 'Warm when you stop, and easy to stuff in a pack.'),
        O('Flannel overshirt', ['flannel', 'shacket', 'overshirt'], 'layer', 'style', 'Adds warmth and looks good in photos at the summit.'),
      ],
      Accessory: [
        O('Baseball cap', ['cap', 'sun hat', 'bucket hat'], 'hat', 'practical', 'Keeps sun off your face on exposed ridges.'),
        O('Sunglasses', ['sunglasses', 'shades'], 'glasses', 'style', 'Cuts glare and finishes the look.'),
      ],
    },
    rain: {
      Footwear: O('Waterproof hiking boots', ['waterproof boot', 'hiking boot', 'gore-tex'], 'shoe', 'rain', 'Wet trails get slick. Waterproof boots give traction and keep feet dry.'),
      Layer: O('Rain shell', ['rain jacket', 'rain shell', 'waterproof jacket', 'windbreaker'], 'layer', 'rain', 'Packs small and blocks both wind and rain.'),
    },
    clothing: [I('Spare socks', ['sock'], 'item', false, 'Dry socks prevent blisters.')],
    gear: {
      'Activity gear': [
        I('Daypack', ['backpack', 'daypack', 'day pack'], 'bag', true, 'Carries water, layers, and snacks hands-free.', 'Any backpack with two straps works.'),
        I('Offline trail map', ['map'], 'map', true, 'Phone signal often drops on trails.', 'Download the area in your maps app before you leave.'),
        I('First-aid kit', ['first aid', 'first-aid'], 'kit', true, 'For blisters, scrapes, and stings.'),
        I('Headlamp', ['headlamp', 'flashlight'], 'light', false, 'In case the hike runs past sunset.'),
      ],
      'Food & water': [COMMON.water, COMMON.snacks],
      'Personal essentials': [COMMON.sunscreen, COMMON.id, COMMON.lipbalm],
      'Electronics': [COMMON.phone, COMMON.charger],
    },
    rainItems: [I('Dry bag', ['dry bag', 'ziploc', 'zip bag'], 'bag', false, 'Keeps your phone and spare layer dry.', 'A zip-top bag does the job.')],
    tip: ['Start cool', 'You’ll warm up within 15 minutes of climbing.'],
  },

  camping: {
    label: 'Camping', icon: 'tent',
    weather: { temp: 14, sky: 'Clear', note: 'Drops to 6° overnight' },
    rainWeather: { temp: 10, sky: 'Rain overnight', note: 'Damp ground in the morning' },
    slots: {
      Top: [
        O('Long-sleeve base layer', ['base layer', 'long sleeve', 'thermal'], 'top', 'practical', 'Holds warmth when the temperature drops at night.'),
        O('Oversized crewneck', ['crewneck', 'sweatshirt', 'hoodie'], 'top', 'style', 'Cozy around the fire and easy to sleep in.'),
      ],
      Bottom: [
        O('Hiking pants', ['hiking pants', 'trail pants', 'cargo pants'], 'bottom', 'practical', 'Durable and quick to dry.'),
        O('Joggers', ['jogger', 'sweatpants'], 'bottom', 'style', 'Relaxed and warm for camp time.'),
      ],
      Footwear: [
        O('Hiking boots', ['hiking boot', 'boots'], 'shoe', 'practical', 'Stable footing on uneven campsite ground.'),
        O('Trail sneakers', ['sneaker', 'trail runner'], 'shoe', 'style', 'Lighter, fine if you’re staying near camp.'),
      ],
      Layer: [
        O('Insulated jacket', ['puffer', 'down jacket', 'insulated'], 'layer', 'practical', 'Nights get cold quickly once the sun sets.'),
        O('Fleece pullover', ['fleece', 'pullover'], 'layer', 'style', 'Warm and soft, but bring a blanket for late nights.'),
      ],
      Accessory: [
        O('Beanie', ['beanie', 'knit hat'], 'hat', 'practical', 'You lose a lot of heat through your head while sleeping.'),
        O('Bucket hat', ['bucket hat', 'cap'], 'hat', 'style', 'Shade during the day.'),
      ],
    },
    rain: {
      Layer: O('Rain shell', ['rain jacket', 'rain shell', 'waterproof jacket'], 'layer', 'rain', 'Wear it over your fleece to stay dry and warm.'),
      Footwear: O('Waterproof boots', ['waterproof boot', 'rain boot', 'gore-tex'], 'shoe', 'rain', 'Wet grass soaks through mesh sneakers.'),
    },
    clothing: [I('Wool socks', ['wool sock', 'sock'], 'item', true, 'Warm feet make for better sleep.')],
    gear: {
      'Activity gear': [
        I('Tent', ['tent'], 'tent', true, 'Check that all the poles and stakes are in the bag.', 'Many campgrounds and outdoor clubs rent tents.'),
        I('Sleeping bag', ['sleeping bag'], 'tent', true, 'Choose one rated a few degrees below the forecast low.'),
        I('Sleeping pad', ['sleeping pad', 'air mattress'], 'tent', true, 'Insulates you from the cold ground.'),
        I('Headlamp', ['headlamp', 'flashlight'], 'light', true, 'Hands-free light for cooking and night walks.'),
        I('First-aid kit', ['first aid', 'first-aid'], 'kit', true, 'For burns, cuts, and splinters.'),
        I('Camp chair', ['camp chair', 'folding chair'], 'item', false, 'Nice to have around the fire.'),
      ],
      'Food & water': [COMMON.water, I('Camp meals', ['meal', 'food'], 'food', true, 'Plan meals for every night you’re out.'), I('Stove and fuel', ['stove'], 'item', false, 'Check fire restrictions before you go.')],
      'Personal essentials': [COMMON.id, COMMON.sunscreen, COMMON.sanitizer, I('Bug spray', ['bug spray', 'repellent'], 'item', false, 'Mosquitoes come out at dusk.')],
      'Electronics': [COMMON.phone, COMMON.charger],
    },
    rainItems: [I('Tarp', ['tarp'], 'tent', false, 'Gives you a dry space to cook and sit.')],
    tip: ['Test your tent', 'Check every pole and stake before you leave.'],
  },

  beach: {
    label: 'Beach day', icon: 'wave',
    weather: { temp: 26, sky: 'Sunny', note: 'Breezy after 3 pm' },
    rainWeather: { temp: 20, sky: 'Scattered showers', note: 'Cooler, windy on the sand' },
    slots: {
      Top: [
        O('Swimsuit', ['swimsuit', 'bikini', 'swim trunks', 'one-piece'], 'top', 'practical', 'Wear it there to skip the changing rooms.'),
        O('Linen button-up', ['linen', 'button-up', 'button up'], 'top', 'style', 'Breezy over a swimsuit and looks put-together.'),
      ],
      Bottom: [
        O('Quick-dry shorts', ['board shorts', 'quick-dry', 'athletic shorts'], 'bottom', 'practical', 'Dry fast after a swim.'),
        O('Denim shorts', ['denim shorts', 'jean shorts', 'cutoffs'], 'bottom', 'style', 'Classic beach look. Wear them for the walk, not the water.'),
      ],
      Footwear: [
        O('Slides', ['slide', 'flip flop', 'flip-flop'], 'shoe', 'practical', 'Easy to rinse and won’t trap sand.'),
        O('Strappy sandals', ['sandal'], 'shoe', 'style', 'Stay on while you walk along the shore.'),
      ],
      Accessory: [
        O('Wide-brim hat', ['sun hat', 'wide-brim', 'straw hat', 'bucket hat'], 'hat', 'practical', 'Shades your face and neck.'),
        O('Sunglasses', ['sunglasses', 'shades'], 'glasses', 'style', 'Glare off the water is intense.'),
      ],
    },
    rain: {
      Layer: O('Windbreaker', ['windbreaker', 'rain jacket', 'shell'], 'layer', 'rain', 'Beach wind plus rain feels colder than the forecast says.'),
    },
    clothing: [I('Cover-up or tee', ['cover-up', 't-shirt', 'tee'], 'top', false, 'For grabbing food or heading home.')],
    gear: {
      'Activity gear': [
        I('Beach towel', ['towel'], 'towel', true, 'For drying off and somewhere to sit.', 'A large bath towel works.'),
        I('Tote bag', ['tote', 'beach bag', 'backpack'], 'bag', true, 'Sand shakes out of canvas easily.'),
        I('Umbrella or shade', ['umbrella', 'canopy'], 'sun', false, 'There’s rarely natural shade on the sand.'),
      ],
      'Food & water': [COMMON.water, COMMON.snacks],
      'Personal essentials': [I('Reef-safe sunscreen', ['sunscreen', 'spf'], 'sun', true, 'Reapply every 2 hours and after swimming.'), COMMON.id, COMMON.lipbalm],
      'Electronics': [COMMON.phone, I('Waterproof phone pouch', ['phone pouch', 'waterproof pouch'], 'device', false, 'Keeps sand and water out.', 'A zip-top bag works.')],
    },
    rainItems: [I('Change of dry clothes', ['change of clothes'], 'top', false, 'In case you get caught in a shower.')],
    tip: ['Swimsuit on first', 'Wear it under your clothes to save space.'],
  },

  concert: {
    label: 'Concert', icon: 'music',
    weather: { temp: 21, sky: 'Clear evening', note: 'Cools to 15° after dark' },
    rainWeather: { temp: 16, sky: 'Evening showers', note: 'Outdoor venue may be muddy' },
    slots: {
      Top: [
        O('Breathable tee', ['tee', 't-shirt', 'tank'], 'top', 'practical', 'Crowds get hot, even outdoors.'),
        O('Band tee or statement top', ['band tee', 'graphic tee', 'crop top', 'statement'], 'top', 'style', 'Matches the show’s energy.'),
      ],
      Bottom: [
        O('Comfortable jeans', ['jeans', 'denim'], 'bottom', 'practical', 'Durable, with pockets you can zip or button.'),
        O('Cargo skirt or pants', ['cargo', 'skirt'], 'bottom', 'style', 'On-trend, and the pockets are useful.'),
      ],
      Footwear: [
        O('Closed-toe sneakers', ['sneaker', 'trainer'], 'shoe', 'practical', 'You’ll be standing for hours and your toes may get stepped on.'),
        O('Platform boots', ['platform', 'boots', 'doc martens'], 'shoe', 'style', 'Extra height helps you see. Break them in first.'),
      ],
      Layer: [
        O('Light jacket', ['jacket', 'denim jacket', 'bomber'], 'layer', 'practical', 'For the walk home after dark.'),
        O('Flannel tied at the waist', ['flannel', 'overshirt'], 'layer', 'style', 'Hands-free warmth that fits the look.'),
      ],
    },
    rain: {
      Layer: O('Packable rain poncho', ['poncho', 'rain jacket'], 'layer', 'rain', 'Many venues don’t allow umbrellas.'),
      Footwear: O('Water-resistant boots', ['waterproof', 'boots', 'rain boot'], 'shoe', 'rain', 'Lawn sections turn muddy fast.'),
    },
    clothing: [],
    gear: {
      'Activity gear': [
        I('Ticket (saved offline)', ['ticket'], 'item', true, 'Venue signal is often jammed, so screenshot it.'),
        I('Clear bag', ['clear bag', 'clear tote'], 'bag', true, 'Most venues only allow clear bags. Check the policy.', 'A small clutch under the size limit often works.'),
        I('Earplugs', ['earplug'], 'item', true, 'Protects your hearing without muffling the music.'),
      ],
      'Food & water': [I('Empty reusable bottle', ['water bottle', 'bottle'], 'bottle', false, 'Many venues have free refill stations.')],
      'Personal essentials': [COMMON.id, COMMON.sanitizer],
      'Electronics': [COMMON.phone, COMMON.charger],
    },
    rainItems: [],
    tip: ['Pick a meet-up spot', 'In case your group gets separated.'],
  },

  city: {
    label: 'City exploring', icon: 'city',
    weather: { temp: 19, sky: 'Mostly sunny', note: 'Breezy near the water' },
    rainWeather: { temp: 15, sky: 'Drizzle', note: 'On and off all day' },
    slots: {
      Top: [
        O('Soft knit tee', ['tee', 't-shirt'], 'top', 'practical', 'Comfortable for a long day on foot.'),
        O('Striped long-sleeve', ['striped', 'long sleeve', 'blouse'], 'top', 'style', 'Polished enough for a nice lunch.'),
      ],
      Bottom: [
        O('Relaxed chinos', ['chino', 'trousers', 'pants'], 'bottom', 'practical', 'Comfortable walking from museums to dinner.'),
        O('Straight-leg jeans', ['jeans', 'denim'], 'bottom', 'style', 'Go with everything you might do.'),
      ],
      Footwear: [
        O('Cushioned walking sneakers', ['sneaker', 'walking shoe', 'trainer'], 'shoe', 'practical', 'City days often add up to 15,000+ steps.'),
        O('Leather loafers', ['loafer', 'leather shoe'], 'shoe', 'style', 'Dressier, but make sure they’re broken in.'),
      ],
      Layer: [
        O('Packable jacket', ['jacket', 'windbreaker'], 'layer', 'practical', 'Light and folds into your bag.'),
        O('Oversized blazer', ['blazer'], 'layer', 'style', 'Dresses up the simplest outfit.'),
      ],
    },
    rain: {
      Layer: O('Hooded rain jacket', ['rain jacket', 'raincoat', 'trench'], 'layer', 'rain', 'Keeps your hands free for maps and coffee.'),
    },
    clothing: [],
    gear: {
      'Activity gear': [
        I('Crossbody bag', ['crossbody', 'sling', 'small bag', 'backpack'], 'bag', true, 'Keeps valuables in front of you in crowds.'),
        I('Transit card or app', ['transit', 'metro card', 'clipper'], 'item', true, 'Saves time at the station.'),
      ],
      'Food & water': [COMMON.water, COMMON.snacks],
      'Personal essentials': [COMMON.id, COMMON.sunscreen],
      'Electronics': [COMMON.phone, COMMON.charger, I('Earbuds', ['earbud', 'airpods', 'headphone'], 'device', false, 'For audio tours and transit.')],
    },
    rainItems: [I('Compact umbrella', ['umbrella'], 'rain', false, 'Fits in a crossbody bag.')],
    tip: ['Save maps offline', 'Download routes and bookings before you go.'],
  },

  roadtrip: {
    label: 'Road trip', icon: 'car',
    weather: { temp: 22, sky: 'Sunny', note: 'Varies along the route' },
    rainWeather: { temp: 16, sky: 'Rain on the route', note: 'Slower driving expected' },
    slots: {
      Top: [
        O('Soft tee', ['tee', 't-shirt'], 'top', 'practical', 'Comfortable for hours of sitting.'),
        O('Vintage graphic tee', ['graphic tee', 'vintage'], 'top', 'style', 'Looks great at roadside stops.'),
      ],
      Bottom: [
        O('Stretch joggers', ['jogger', 'sweatpants'], 'bottom', 'practical', 'Won’t dig in on long drives.'),
        O('Relaxed jeans', ['jeans', 'denim'], 'bottom', 'style', 'Easy to wear from car to diner.'),
      ],
      Footwear: [
        O('Slip-on sneakers', ['slip-on', 'sneaker'], 'shoe', 'practical', 'Easy on and off at stops.'),
        O('Canvas high-tops', ['high-top', 'converse'], 'shoe', 'style', 'Classic road-trip look.'),
      ],
      Layer: [
        O('Zip hoodie', ['hoodie', 'zip-up'], 'layer', 'practical', 'Car AC can get cold.'),
        O('Denim jacket', ['denim jacket', 'jean jacket'], 'layer', 'style', 'Works for every stop along the way.'),
      ],
    },
    rain: { Layer: O('Rain jacket', ['rain jacket', 'raincoat'], 'layer', 'rain', 'For quick dashes to gas stations and viewpoints.') },
    clothing: [],
    gear: {
      'Activity gear': [
        I('Driver’s license and insurance', ['license', 'insurance'], 'item', true, 'Keep both in the glove box.'),
        I('Car charger', ['car charger', 'usb cable'], 'device', true, 'You’ll use your phone for navigation the whole way.'),
        I('Offline playlist', ['playlist', 'spotify'], 'music', false, 'Rural stretches often have no signal.'),
        I('Travel pillow', ['pillow'], 'item', false, 'For passengers.'),
      ],
      'Food & water': [COMMON.water, COMMON.snacks],
      'Personal essentials': [COMMON.sunscreen, COMMON.sanitizer, I('Sunglasses', ['sunglasses'], 'glasses', true, 'Reduces glare for the driver.')],
      'Electronics': [COMMON.phone],
    },
    rainItems: [],
    tip: ['Keep a cabin bag', 'Essentials up front, the rest in the trunk.'],
  },

  picnic: {
    label: 'Picnic', icon: 'basket',
    weather: { temp: 23, sky: 'Sunny', note: 'Light breeze' },
    rainWeather: { temp: 17, sky: 'Passing showers', note: 'Damp grass' },
    slots: {
      Top: [
        O('Breathable cotton tee', ['tee', 't-shirt'], 'top', 'practical', 'Cool in the sun.'),
        O('Sundress', ['dress', 'sundress'], 'top', 'style', 'Easy and photogenic.'),
      ],
      Bottom: [
        O('Light shorts', ['shorts'], 'bottom', 'practical', 'Comfortable for sitting on the ground.'),
        O('Linen pants', ['linen pants', 'wide-leg'], 'bottom', 'style', 'Breezy and relaxed.'),
      ],
      Footwear: [
        O('Sneakers', ['sneaker'], 'shoe', 'practical', 'Good if you’ll walk to the spot.'),
        O('Sandals', ['sandal'], 'shoe', 'style', 'Easy to kick off on the blanket.'),
      ],
      Accessory: [
        O('Sun hat', ['sun hat', 'straw hat', 'bucket hat', 'cap'], 'hat', 'practical', 'Shade is never where you want it.'),
        O('Sunglasses', ['sunglasses'], 'glasses', 'style', 'Finishes the look.'),
      ],
    },
    rain: { Layer: O('Light rain jacket', ['rain jacket', 'windbreaker'], 'layer', 'rain', 'Keeps you comfortable if a shower passes through.') },
    clothing: [],
    gear: {
      'Activity gear': [
        I('Picnic blanket', ['blanket'], 'towel', true, 'A water-resistant backing keeps you dry.', 'A large towel or sheet works.'),
        I('Tote or basket', ['tote', 'basket', 'bag'], 'basket', true, 'Carries food and blanket together.'),
        I('Trash bag', ['trash bag'], 'item', true, 'Leave the spot cleaner than you found it.'),
      ],
      'Food & water': [I('Picnic food', ['food', 'sandwich'], 'food', true, 'Choose things that travel well in the heat.'), COMMON.water, I('Cooler bag', ['cooler'], 'bag', false, 'Keeps drinks cold.')],
      'Personal essentials': [COMMON.sunscreen, COMMON.sanitizer],
      'Electronics': [COMMON.phone, I('Portable speaker', ['speaker'], 'music', false, 'Keep the volume friendly.')],
    },
    rainItems: [I('Waterproof blanket liner', ['tarp', 'liner'], 'towel', false, 'Stops damp grass soaking through.')],
    tip: ['Freeze a water bottle', 'Keeps food cold, then becomes a cold drink.'],
  },


  water: {
    label: 'Water sports', icon: 'paddle',
    weather: { temp: 24, sky: 'Sunny', note: 'Calm in the morning' },
    rainWeather: { temp: 18, sky: 'Showers', note: 'Choppy water' },
    slots: {
      Top: [
        O('Rash guard or quick-dry tee', ['rash guard', 'swim shirt', 'quick-dry'], 'top', 'practical', 'Blocks sun and won’t stay soggy.'),
        O('Swimsuit', ['swimsuit', 'bikini', 'swim trunks', 'one-piece'], 'top', 'style', 'Easy to wear under everything.'),
      ],
      Bottom: [
        O('Board shorts', ['board shorts', 'swim trunks', 'quick-dry shorts'], 'bottom', 'practical', 'Dry fast between dips.'),
        O('Swim leggings', ['swim leggings', 'leggings'], 'bottom', 'style', 'Sun protection without the bulk.'),
      ],
      Footwear: [
        O('Water shoes', ['water shoe', 'aqua shoe', 'river sandal', 'teva', 'chaco'], 'shoe', 'practical', 'Grip on wet rocks and docks.'),
        O('Sport sandals', ['sandal'], 'shoe', 'style', 'Strapped on, so they won’t float away.'),
      ],
      Accessory: [
        O('Sunglasses with a strap', ['sunglasses', 'shades'], 'glasses', 'practical', 'Glare off water is intense, and straps stop them sinking.'),
        O('Sun cap', ['cap', 'sun hat', 'bucket hat'], 'hat', 'style', 'Keeps sun off your face.'),
      ],
    },
    rain: { Layer: O('Splash jacket', ['splash jacket', 'rain jacket', 'windbreaker'], 'layer', 'rain', 'Wind on the water chills you fast when wet.') },
    clothing: [I('Dry change of clothes', ['change of clothes'], 'top', true, 'For the ride home.')],
    gear: {
      'Activity gear': [
        I('Dry bag', ['dry bag'], 'bag', true, 'Keeps your phone, keys, and layer dry.', 'A zip-top bag works for small things.'),
        I('Life jacket', ['life jacket', 'pfd', 'life vest'], 'item', true, 'Required for most water sports.', 'Rental outfitters usually include one. Confirm when you book.'),
        I('Towel', ['towel'], 'towel', true, 'For drying off after.'),
        I('Waterproof phone pouch', ['phone pouch', 'waterproof pouch'], 'device', false, 'Lets you take photos on the water.'),
      ],
      'Food & water': [COMMON.water, COMMON.snacks],
      'Personal essentials': [I('Reef-safe sunscreen', ['sunscreen', 'spf'], 'sun', true, 'Reapply after every swim.'), COMMON.id],
      'Electronics': [COMMON.phone],
    },
    rainItems: [],
    tip: ['Leave valuables behind', 'Lock them in the car or a locker.'],
  },

  nightlife: {
    label: 'Nightlife', icon: 'cocktail',
    weather: { temp: 15, sky: 'Clear night', note: 'Cooler after midnight' },
    rainWeather: { temp: 12, sky: 'Rain overnight', note: 'Wet streets' },
    slots: {
      Top: [
        O('Breathable dark top', ['black tee', 'button-up', 'tee'], 'top', 'practical', 'Clubs get hot, and dark colors hide spills.'),
        O('Statement going-out top', ['bodysuit', 'silk', 'satin', 'sequin', 'going-out'], 'top', 'style', 'Made for the dance floor.'),
      ],
      Bottom: [
        O('Dark jeans', ['jeans'], 'bottom', 'practical', 'Works for nearly any dress code.'),
        O('Mini skirt or tailored trousers', ['skirt', 'trousers'], 'bottom', 'style', 'Dressier for a night out.'),
      ],
      Footwear: [
        O('Clean leather sneakers or boots', ['leather sneaker', 'chelsea boot', 'boots', 'sneaker'], 'shoe', 'practical', 'Comfortable for hours of standing. Some clubs turn away athletic shoes, so check first.'),
        O('Heels or dress shoes', ['heels', 'dress shoe', 'loafer'], 'shoe', 'style', 'Dressed up. Pack blister plasters.'),
      ],
      Layer: [
        O('Light jacket', ['jacket'], 'layer', 'practical', 'For the queue outside and the walk home.'),
        O('Leather jacket', ['leather jacket'], 'layer', 'style', 'Finishes the look and handles the cold.'),
      ],
    },
    rain: { Layer: O('Compact rain jacket', ['rain jacket', 'raincoat'], 'layer', 'rain', 'Queues are outdoors and coat checks fill up.') },
    clothing: [],
    gear: {
      'Activity gear': [
        I('Small crossbody or clutch', ['crossbody', 'clutch', 'small bag'], 'bag', true, 'Keeps your hands free and your phone close.'),
        I('Ride-home plan', ['ride-share', 'uber', 'lyft'], 'car', true, 'Set up a ride-share app or know when the last train leaves.'),
        I('Earplugs', ['earplug'], 'item', false, 'Clubs are loud enough to damage hearing.'),
        I('Blister plasters', ['blister', 'plaster', 'band-aid'], 'kit', false, 'For new shoes.'),
      ],
      'Personal essentials': [I('ID and card', ['id', 'wallet', 'card'], 'item', true, 'Bouncers check ID, even if you look older.')],
      'Electronics': [COMMON.phone, COMMON.charger],
    },
    rainItems: [],
    tip: ['Check the dress code', 'Many clubs turn away sneakers or shorts.'],
  },

  dining: {
    label: 'Fine dining', icon: 'dining',
    weather: { temp: 18, sky: 'Mild evening', note: 'Cools after sunset' },
    rainWeather: { temp: 14, sky: 'Evening rain', note: 'Wet sidewalks' },
    slots: {
      Top: [
        O('Collared shirt or blouse', ['button-up', 'collared', 'blouse', 'shirt'], 'top', 'practical', 'Meets most smart-casual dress codes.'),
        O('Silk top or dress', ['dress', 'silk', 'satin'], 'top', 'style', 'Elegant for a special dinner.'),
      ],
      Bottom: [
        O('Tailored trousers', ['trousers', 'slacks', 'dress pants', 'chino'], 'bottom', 'practical', 'Polished and comfortable through a long meal.'),
        O('Midi skirt', ['skirt'], 'bottom', 'style', 'Dressy without being formal.'),
      ],
      Footwear: [
        O('Leather shoes or loafers', ['loafer', 'leather shoe', 'oxford', 'dress shoe', 'flats'], 'shoe', 'practical', 'Most fine-dining dress codes rule out sneakers.'),
        O('Heels or polished boots', ['heels', 'boots'], 'shoe', 'style', 'Elevates the outfit.'),
      ],
      Layer: [
        O('Blazer', ['blazer', 'sport coat'], 'layer', 'practical', 'Some restaurants expect a jacket.'),
        O('Tailored coat', ['coat', 'trench'], 'layer', 'style', 'Looks sharp walking in.'),
      ],
      Accessory: [
        O('Belt', ['belt'], 'item', 'practical', 'Finishes tucked-in shirts.'),
        O('Watch or simple jewelry', ['watch', 'jewelry', 'necklace', 'earrings'], 'item', 'style', 'Small details for a special night.'),
      ],
    },
    rain: { Layer: O('Trench coat', ['trench', 'raincoat'], 'layer', 'rain', 'Keeps a dressy outfit dry.') },
    clothing: [],
    gear: {
      'Activity gear': [
        I('Reservation confirmation', ['reservation'], 'item', true, 'Screenshot it in case you lose signal.'),
        I('Small bag or clutch', ['clutch', 'small bag', 'crossbody'], 'bag', false, 'Fits under the table.'),
      ],
      'Personal essentials': [COMMON.id, I('Breath mints', ['mints'], 'item', false, 'After the garlic course.')],
      'Electronics': [COMMON.phone],
    },
    rainItems: [I('Compact umbrella', ['umbrella'], 'rain', false, 'Protects your outfit between car and door.')],
    tip: ['Check the dress code', '“Smart casual” usually means no sneakers.'],
  },

  crafts: {
    label: 'Crafts and workshops', icon: 'brush',
    weather: { temp: 19, sky: 'Indoors', note: 'Studio temperature' },
    rainWeather: { temp: 15, sky: 'Showers', note: 'Indoors anyway' },
    slots: {
      Top: [
        O('An old tee you don’t mind staining', ['old tee', 't-shirt', 'tee'], 'top', 'practical', 'Clay, paint, and glaze stain.'),
        O('Linen shirt', ['linen'], 'top', 'style', 'Relaxed and artsy. Roll the sleeves up.'),
      ],
      Bottom: [
        O('Dark jeans', ['jeans'], 'bottom', 'practical', 'Hides splatters.'),
        O('Overalls', ['overalls', 'dungarees'], 'bottom', 'style', 'The classic studio look, with pockets.'),
      ],
      Footwear: [
        O('Closed-toe shoes', ['sneaker', 'closed-toe', 'boots'], 'shoe', 'practical', 'Required in most pottery and woodworking studios.'),
      ],
      Accessory: [
        O('Hair tie or clip', ['hair tie', 'scrunchie', 'clip'], 'item', 'practical', 'Keeps hair out of the clay.'),
      ],
    },
    rain: { Layer: O('Rain jacket', ['rain jacket', 'raincoat'], 'layer', 'rain', 'For getting to the studio.') },
    clothing: [],
    gear: {
      'Activity gear': [
        I('Booking confirmation', ['booking', 'reservation'], 'item', true, 'Many workshops have limited spots.'),
        I('Apron', ['apron'], 'item', false, 'Protects your clothes.', 'Most studios lend them.'),
        I('Tote for your finished piece', ['tote'], 'bag', false, 'Some pieces are ready the same day.'),
      ],
      'Personal essentials': [COMMON.id, I('Hand cream', ['hand cream', 'lotion'], 'item', false, 'Clay dries out your hands.')],
      'Electronics': [COMMON.phone],
    },
    rainItems: [],
    tip: ['Dress for mess', 'Skip rings and wear clothes you can stain.'],
  },

  themepark: {
    label: 'Theme park', icon: 'ferris',
    weather: { temp: 25, sky: 'Sunny', note: 'Little shade in queues' },
    rainWeather: { temp: 19, sky: 'Showers', note: 'Some rides may close' },
    slots: {
      Top: [
        O('Breathable tee', ['tee', 't-shirt', 'athletic'], 'top', 'practical', 'You’ll be in the sun and queues all day.'),
        O('Fun graphic or matching group tee', ['graphic tee', 'character'], 'top', 'style', 'Great in photos.'),
      ],
      Bottom: [
        O('Shorts with zip pockets', ['shorts'], 'bottom', 'practical', 'Loose items fly out on rides.'),
        O('Comfortable jeans', ['jeans'], 'bottom', 'style', 'Good for cooler evenings in the park.'),
      ],
      Footwear: [
        O('Cushioned sneakers', ['sneaker', 'walking shoe', 'trainer'], 'shoe', 'practical', 'Most visitors walk over 10 miles in a day.'),
        O('Slip-on sneakers', ['slip-on', 'converse'], 'shoe', 'style', 'Comfortable and quick through security.'),
      ],
      Accessory: [
        O('Cap', ['cap', 'sun hat'], 'hat', 'practical', 'Shade while you wait.'),
        O('Character ears or headband', ['ears', 'headband'], 'hat', 'style', 'Part of the fun.'),
      ],
    },
    rain: { Layer: O('Rain poncho', ['poncho', 'rain jacket'], 'layer', 'rain', 'Much cheaper to bring than to buy in the park.') },
    clothing: [],
    gear: {
      'Activity gear': [
        I('Park tickets in the app', ['ticket'], 'item', true, 'Saves time at the gate.'),
        I('Small crossbody or belt bag', ['crossbody', 'belt bag', 'fanny pack'], 'bag', true, 'Stays on during rides, or fits in ride lockers.'),
        I('Zip-top bag for water rides', ['zip bag', 'ziploc'], 'item', false, 'Keeps your phone dry.'),
      ],
      'Food & water': [I('Refillable water bottle', ['water bottle', 'bottle'], 'bottle', true, 'Most parks have free refill stations.'), I('Snacks', ['snack'], 'food', false, 'Check the park’s outside-food policy.')],
      'Personal essentials': [COMMON.sunscreen, COMMON.id],
      'Electronics': [COMMON.phone, I('Portable charger', ['charger', 'power bank'], 'device', true, 'Park apps for tickets and wait times drain your battery by the afternoon.')],
    },
    rainItems: [],
    tip: ['Arrive at opening', 'Lines are shortest in the first hour.'],
  },

  skiing: {
    label: 'Skiing and snow', icon: 'snow',
    weather: { temp: -2, sky: 'Snow showers', note: 'Colder at the summit' },
    rainWeather: { temp: -4, sky: 'Heavy snow', note: 'Low visibility' },
    slots: {
      Top: [
        O('Thermal base layer', ['thermal', 'base layer', 'merino'], 'top', 'practical', 'Wicks sweat so you stay warm on the lift.'),
        O('Fitted fleece midlayer', ['fleece', 'quarter zip'], 'top', 'style', 'Warm and sleek under a shell.'),
      ],
      Bottom: [
        O('Waterproof ski pants', ['ski pants', 'snow pants', 'bibs'], 'bottom', 'practical', 'You’ll sit in the snow more than you expect.'),
      ],
      Footwear: [
        O('Waterproof snow boots', ['snow boot', 'winter boot', 'waterproof boot'], 'shoe', 'practical', 'For the lodge and the walk to the lifts. Ski boots are usually rented.'),
      ],
      Layer: [
        O('Insulated ski jacket', ['ski jacket', 'puffer', 'insulated'], 'layer', 'practical', 'Windproof warmth for the lifts.'),
        O('Colorful shell over a fleece', ['shell', 'rain jacket'], 'layer', 'style', 'Easy to spot on the slopes, and you can adjust the layers.'),
      ],
      Accessory: [
        O('Ski goggles', ['goggles'], 'glasses', 'practical', 'Snow glare and wind make it hard to see without them.'),
        O('Beanie', ['beanie', 'knit hat'], 'hat', 'style', 'For après-ski.'),
      ],
    },
    rain: {},
    clothing: [
      I('Ski socks', ['ski sock', 'wool sock'], 'item', true, 'One thin pair. Thick socks make boots fit worse.'),
      I('Waterproof gloves', ['glove', 'mitten'], 'item', true, 'Wet gloves end ski days early.'),
      I('Neck gaiter', ['gaiter', 'buff', 'scarf'], 'item', false, 'Covers your face on cold lifts.'),
    ],
    gear: {
      'Activity gear': [
        I('Lift pass', ['lift pass', 'lift ticket'], 'item', true, 'Usually cheaper bought online ahead of time.'),
        I('Helmet', ['helmet'], 'hat', true, 'Strongly recommended on any run.', 'Rent one with your skis.'),
        I('Skis or snowboard', ['skis', 'snowboard'], 'item', false, 'Bring your own or rent at the mountain.'),
        I('Hand warmers', ['hand warmer'], 'item', false, 'Small and cheap, and a lifesaver on cold lifts.'),
      ],
      'Food & water': [COMMON.water, COMMON.snacks],
      'Personal essentials': [I('Sunscreen', ['sunscreen', 'spf'], 'sun', true, 'Snow reflects UV, so you burn faster at altitude.'), I('Lip balm with SPF', ['lip balm', 'chapstick'], 'sun', true, 'Cold wind cracks lips.'), COMMON.id],
      'Electronics': [COMMON.phone, COMMON.charger],
    },
    rainItems: [],
    tip: ['Keep your phone warm', 'Cold drains batteries. Use an inside pocket.'],
  },

  formal: {
    label: 'Wedding or formal event', icon: 'ring',
    weather: { temp: 20, sky: 'Mild', note: 'Cooler at the evening reception' },
    rainWeather: { temp: 15, sky: 'Showers', note: 'Outdoor parts may move inside' },
    slots: {
      Top: [
        O('Suit or formal dress', ['suit', 'dress', 'gown'], 'top', 'practical', 'Matches most formal and cocktail dress codes.'),
        O('Statement jumpsuit or bold suit', ['jumpsuit', 'sequin', 'velvet', 'silk'], 'top', 'style', 'Stands out without breaking the dress code.'),
      ],
      Footwear: [
        O('Dress shoes or block heels', ['dress shoe', 'oxford', 'block heel', 'loafer'], 'shoe', 'practical', 'Block heels won’t sink into grass at outdoor venues.'),
        O('Heels', ['heels', 'stiletto'], 'shoe', 'style', 'Pack flats for dancing later.'),
      ],
      Layer: [
        O('Wrap or blazer', ['wrap', 'shawl', 'blazer'], 'layer', 'practical', 'Evening receptions get chilly.'),
        O('Tailored coat', ['coat'], 'layer', 'style', 'Elegant over formalwear.'),
      ],
      Accessory: [
        O('Tie or jewelry', ['tie', 'jewelry', 'earrings', 'cufflinks', 'necklace'], 'item', 'practical', 'Finishes a formal look.'),
      ],
    },
    rain: { Layer: O('Trench coat', ['trench', 'raincoat'], 'layer', 'rain', 'Protects your outfit between car and venue.') },
    clothing: [],
    gear: {
      'Activity gear': [
        I('Invitation details and gift', ['invitation', 'gift', 'card'], 'item', true, 'Note the address, timing, and dress code.'),
        I('Garment bag', ['garment bag'], 'bag', false, 'Keeps formalwear wrinkle-free.'),
        I('Foldable flats', ['flats', 'foldable'], 'shoe', false, 'For the dance floor.'),
        I('Wrinkle-release spray', ['wrinkle', 'steamer'], 'item', false, 'Faster than finding an iron.'),
      ],
      'Personal essentials': [COMMON.id, I('Blister plasters', ['blister', 'plaster', 'band-aid'], 'kit', false, 'For dress shoes.')],
      'Electronics': [COMMON.phone],
    },
    rainItems: [I('Compact umbrella', ['umbrella'], 'rain', false, 'For outdoor photos between showers.')],
    tip: ['Hang your outfit up', 'Do it when you arrive so creases drop out.'],
  },

  sports: {
    label: 'Sports game', icon: 'trophy',
    weather: { temp: 19, sky: 'Partly cloudy', note: 'Cooler after sunset' },
    rainWeather: { temp: 14, sky: 'Showers', note: 'Uncovered seats get wet' },
    slots: {
      Top: [
        O('Comfortable tee', ['tee', 't-shirt'], 'top', 'practical', 'Easy to layer under a hoodie.'),
        O('Team jersey', ['jersey', 'team shirt'], 'top', 'style', 'Show your colors.'),
      ],
      Bottom: [O('Jeans', ['jeans'], 'bottom', 'practical', 'Durable for stadium seats.')],
      Footwear: [O('Sneakers', ['sneaker', 'trainer'], 'shoe', 'practical', 'Lots of stairs and walking.')],
      Layer: [
        O('Hoodie or light jacket', ['hoodie', 'jacket'], 'layer', 'practical', 'Stadiums get cold after sunset.'),
        O('Team hoodie', ['team hoodie'], 'layer', 'style', 'Warm and on theme.'),
      ],
      Accessory: [O('Team cap', ['cap'], 'hat', 'style', 'Sun cover for day games.')],
    },
    rain: { Layer: O('Rain poncho', ['poncho', 'rain jacket'], 'layer', 'rain', 'Most stadiums don’t allow umbrellas.') },
    clothing: [],
    gear: {
      'Activity gear': [
        I('Tickets in your wallet app', ['ticket'], 'item', true, 'Stadium signal is unreliable, so save them offline.'),
        I('Clear bag', ['clear bag', 'clear tote'], 'bag', true, 'Most stadiums only allow small clear bags.', 'Go without a bag and use your pockets.'),
        I('Seat cushion', ['cushion'], 'item', false, 'Bleachers are hard.'),
      ],
      'Personal essentials': [COMMON.sunscreen, COMMON.id],
      'Electronics': [COMMON.phone, COMMON.charger],
    },
    rainItems: [],
    tip: ['Check the bag policy', 'Most stadiums only allow small clear bags.'],
  },

  custom: {
    label: 'Something else', icon: 'spark',
    weather: { temp: 20, sky: 'Mild', note: 'Typical for the season' },
    rainWeather: { temp: 15, sky: 'Showers', note: 'Bring a layer' },
    slots: {
      Top: [
        O('Versatile tee', ['tee', 't-shirt'], 'top', 'practical', 'Works for most plans.'),
        O('Favorite top', ['blouse', 'shirt', 'sweater'], 'top', 'style', 'Something that feels like you.'),
      ],
      Bottom: [
        O('Comfortable pants', ['pants', 'chino', 'jogger'], 'bottom', 'practical', 'Easy to move in.'),
        O('Go-to jeans', ['jeans'], 'bottom', 'style', 'Reliable and stylish.'),
      ],
      Footwear: [
        O('Walking sneakers', ['sneaker'], 'shoe', 'practical', 'Comfortable all day.'),
        O('Boots', ['boots'], 'shoe', 'style', 'Adds some edge.'),
      ],
      Layer: [
        O('Light jacket', ['jacket'], 'layer', 'practical', 'For changing temperatures.'),
        O('Cardigan', ['cardigan', 'sweater'], 'layer', 'style', 'Soft and easy to layer.'),
      ],
    },
    rain: { Layer: O('Rain jacket', ['rain jacket', 'raincoat'], 'layer', 'rain', 'Keeps you dry if plans move outdoors.') },
    clothing: [],
    gear: {
      'Activity gear': [I('Everyday bag', ['bag', 'backpack', 'tote'], 'bag', true, 'Holds the essentials.')],
      'Food & water': [COMMON.water, COMMON.snacks],
      'Personal essentials': [COMMON.id, COMMON.sunscreen],
      'Electronics': [COMMON.phone, COMMON.charger],
    },
    rainItems: [I('Compact umbrella', ['umbrella'], 'rain', false, 'Light and folds small.')],
    tip: ['Check the rules', 'See what the venue doesn’t allow.'],
  },
};

const PACKING = [
  { id: 'light', label: 'Light', desc: 'Essentials only' },
  { id: 'balanced', label: 'Balanced', desc: 'Essentials plus a few extras' },
  { id: 'prepared', label: 'Prepared', desc: 'Ready for anything' },
];

// Bag types. tier decides what goes where: personal bags hold valuables and day-of items,
// checked bags take liquids and bulky gear. Capacities are rough litres.
const BAGS = [
  { id: 'backpack', label: 'Backpack', cap: 25, tier: 'personal', icon: 'backpack', kw: 'backpack daypack' },
  { id: 'tote', label: 'Tote or personal item', cap: 15, tier: 'personal', icon: 'tote', kw: 'tote' },
  { id: 'carryon', label: 'Carry-on suitcase', cap: 40, tier: 'carry', icon: 'roller', kw: '' },
  { id: 'duffel', label: 'Duffel', cap: 55, tier: 'carry', icon: 'duffel', kw: 'duffel' },
  { id: 'medium', label: 'Medium checked bag', cap: 65, tier: 'checked', icon: 'checked', kw: '' },
  { id: 'large', label: 'Large checked bag', cap: 95, tier: 'checked', icon: 'checkedL', kw: '' },
];

// Approximate packed volume in litres, by icon, with overrides by name.
const SIZE_BY_ICON = { top: 1.5, bottom: 2, shoe: 6, layer: 4, hat: .5, glasses: .3, bag: 2, bottle: 1, device: .5, sun: .3, food: 2, kit: 1, tent: 8, map: .1, light: .3, item: .5, towel: 3, music: .5, basket: 4, rain: 1, bike: 1 };
const SIZE_BY_NAME = { 'Tent': 12, 'Sleeping bag': 10, 'Sleeping pad': 5, 'Camp chair': 6, 'Insulated puffer jacket': 7, 'Insulated jacket': 7, 'Daypack': 3, 'Tarp': 3, 'Umbrella or shade': 4, 'Cooler bag': 4, 'Change of clothes': 4, 'Picnic food': 4, 'Camp meals': 4, 'Workout outfit': 2.5, 'Running outfit': 2.5, 'Yoga outfit': 2.5, 'Underwear and socks': .4, 'Travel yoga mat': 6, 'Makeup and skincare': 1.5, 'Makeup for touch-ups': .5, 'Foldable duffel or tote': 1, 'Charging cables': .3, 'Wall charger': .3, 'Travel adapter': .3, 'Hiking boots': 8, 'Waterproof hiking boots': 8, 'Waterproof boots': 8, 'Platform boots': 7 };
const LIQUIDS = ['Sunscreen', 'Reef-safe sunscreen', 'Bug spray', 'Hand sanitizer', 'Lip balm with SPF', 'Toothbrush and toothpaste', 'Travel shampoo and conditioner', 'Travel body wash', 'Deodorant', 'Makeup and skincare'];
const BULKY = ['Tent', 'Sleeping bag', 'Sleeping pad', 'Camp chair', 'Stove and fuel', 'Tarp', 'Umbrella or shade', 'Cooler bag'];
const PERSONAL_CATS = ['Electronics', 'Food & water'];
const PERSONAL_NAMES = ['ID and card', 'Ticket (saved offline)', 'Driver’s license and insurance', 'Transit card or app', 'First-aid kit', 'Offline trail map', 'Headlamp'];

// Options added when a stop's temperatures call for them.
const COLD = {
  Layer: lo => O('Insulated puffer jacket', ['puffer', 'down jacket', 'insulated'], 'layer', 'cold', `Lows near ${tF(lo)}. A puffer traps heat and compresses small.`),
  Accessory: lo => O('Warm beanie', ['beanie', 'knit hat', 'toque'], 'hat', 'cold', `You lose heat fast through your head when it’s ${tF(lo)} out.`),
};
const COLD_EXTRAS = lo => [
  I('Thermal base layer', ['thermal', 'base layer', 'long underwear'], 'top', true, `Worn under everything when it drops to ${tF(lo)}.`),
  I('Warm gloves', ['glove', 'mitten'], 'item', true, 'Cold hands make everything harder.', 'Wool socks over your hands work in a pinch.'),
];
const US_STATES = { AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming' };


// Recurring workouts that run alongside the stops (e.g. the hotel gym every morning).
const WORKOUTS = {
  gym: { label: 'Gym', outfit: 'Workout outfit', kw: ['workout', 'gym', 'athletic', 'dri-fit'], items: [
    I('Training shoes', ['training shoe', 'gym shoe', 'running shoe', 'sneaker', 'trainer'], 'shoe', true, 'Your trail runners or sneakers can double up if space is tight.'),
    I('Workout towel', ['gym towel', 'workout towel'], 'towel', false, 'Some hotel gyms run out.'),
    I('Earbuds', ['earbud', 'airpods', 'headphone'], 'device', false, 'For your workout playlist.'),
  ] },
  running: { label: 'Running', outfit: 'Running outfit', kw: ['running', 'athletic', 'dri-fit'], items: [
    I('Running shoes', ['running shoe', 'trail runner', 'sneaker', 'trainer'], 'shoe', true, 'Run in shoes you’ve already broken in.'),
    I('Reflective band or vest', ['reflective'], 'item', false, 'For early or evening runs on unfamiliar streets.'),
  ] },
  yoga: { label: 'Yoga or pilates', outfit: 'Yoga outfit', kw: ['yoga', 'leggings', 'athletic'], items: [
    I('Travel yoga mat', ['yoga mat'], 'towel', false, 'Thin travel mats fold flat.', 'A hotel towel on carpet works for most flows.'),
  ] },
  swimming: { label: 'Swimming', outfit: 'Swimsuit', kw: ['swimsuit', 'swim trunks', 'bikini', 'one-piece'], items: [
    I('Goggles', ['goggles'], 'glasses', true, 'Pool chlorine stings without them.'),
    I('Quick-dry towel', ['quick-dry towel', 'microfiber towel'], 'towel', false, 'Pools don’t always supply towels.'),
  ] },
};

const LODGING = [
  { id: 'hotel', label: 'Hotel' },
  { id: 'rental', label: 'Airbnb or rental' },
  { id: 'hostel', label: 'Hostel' },
  { id: 'friends', label: 'Friends or family' },
  { id: 'camping', label: 'Campsite' },
];

// Why to bring your own shampoo and body wash, depending on where you stay.
const AMENITY_NOTE = {
  hotel: 'Many hotels provide these, but not all. Some in the UK and Europe have dropped single-use toiletries, so check with your hotel.',
  rental: 'Airbnbs and rentals often don’t stock these, or only leave a little.',
  hostel: 'Hostels rarely provide toiletries.',
  friends: 'Your hosts may have some, but it’s polite to bring your own.',
  camping: 'Choose biodegradable soap if you’ll wash outdoors.',
  none: 'Some lodgings don’t provide toiletries. Check before you go.',
};

// How the activity picker is grouped.
const ACTIVITY_GROUPS = [
  ['Outdoors', ['hiking', 'camping', 'skiing', 'picnic']],
  ['On the water', ['beach', 'water']],
  ['Going out', ['dining', 'nightlife', 'concert', 'sports']],
  ['Exploring', ['city', 'themepark', 'roadtrip', 'crafts']],
  ['Occasions', ['formal', 'custom']],
];

// Plug types by country code, for the travel adapter suggestion.
const PLUGS = { US: 'A/B', CA: 'A/B', MX: 'A/B', JP: 'A/B', TW: 'A/B', PH: 'A/B', GB: 'G', IE: 'G', HK: 'G', SG: 'G', MY: 'G', AE: 'G', QA: 'G', AU: 'I', NZ: 'I', CN: 'A/I', IN: 'D', CH: 'J', IT: 'L', ZA: 'M', KR: 'C/F', TH: 'A/C', BR: 'N', IL: 'H', DK: 'K',
  FR: 'C/E', BE: 'C/E', DE: 'C/F', ES: 'C/F', NL: 'C/F', PT: 'C/F', AT: 'C/F', GR: 'C/F', SE: 'C/F', NO: 'C/F', FI: 'C/F', PL: 'C/E', CZ: 'C/E', HU: 'C/F', IS: 'C/F', TR: 'C/F', HR: 'C/F', ID: 'C/F', VN: 'A/C', EG: 'C/F', MA: 'C/E' };

const SHOPPING = [
  { id: 'none', label: 'No', desc: 'Pack as planned', share: 0 },
  { id: 'some', label: 'A little', desc: 'Leave some room', share: .15 },
  { id: 'lots', label: 'A lot', desc: 'Save real space', share: .3 },
];
