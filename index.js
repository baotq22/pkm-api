const express = require('express');
const csv = require('csvtojson');
const cors = require('cors');
const {v4: uuidv4} = require('uuid');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 5000;

app.use(cors());
app.use(bodyParser.json());

const csvFilePath = 'data/pokemon.csv';

let pokemons = [];

const pokemonTypes = [
  "bug", "dragon", "fairy", "fire", "ghost", 
  "ground", "normal", "psychic", "steel", "dark", 
  "electric", "fighting", "flying", "grass", "ice", 
  "poison", "rock", "water"
];

const loadPokemonData = async () => {
  try {
    pokemons = await csv().fromFile(csvFilePath);

    pokemons = pokemons.slice(0, 721).map((pokemon, index) => ({
      id: index + 1,
      name: pokemon.Name.toLowerCase(),
      types: [
        pokemon.Type1.toLowerCase(),
        pokemon.Type2 ? pokemon.Type2.toLowerCase() : null
      ].filter(Boolean),
      url: `https://pkm-api.onrender.com/images/${index + 1}.png`
    }));
    console.log("Pokemon data loaded successfully.");
  } catch (error) {
    console.error("Error loading Pokémon data:", error);
  }
};

loadPokemonData();

const getNeighbors = (id) => {
  const totalPokemons = pokemons.length;
  const currentId = parseInt(id);

  const previousId = (currentId - 1) < 1 ? totalPokemons : (currentId - 1);
  const nextId = (currentId - 1) > totalPokemons ? 1 : (currentId + 1);

  const currentItem = pokemons.find(p => p.id === currentId);
  const previousItem = pokemons.find(p => p.id === previousId);
  const nextItem = pokemons.find(p => p.id === nextId);

  return {
    current: currentItem,
    previous: previousItem,
    next: nextItem
  }
}

const paginate = (array, page, limit) => {
  const start = (page - 1) * limit;
  const end = start + limit;
  return array.slice(start, end);
};

app.use('/images', express.static(path.join(__dirname, 'images')));

app.get('/pokemons', (req, res) => {
  const { page = 1, limit = 20, search, type } = req.query;

  let filteredPokemons = pokemons;

  if (type) {
    filteredPokemons = filteredPokemons.filter(pokemon =>
      pokemon.types.includes(type.toLowerCase())
    );
  }

  if (search) {
    filteredPokemons = filteredPokemons.filter(pokemon =>
      pokemon.name.includes(search.toLowerCase())
    );
  }

  const paginatedPokemons = paginate(filteredPokemons, parseInt(page), parseInt(limit));

  res.json({
    data: paginatedPokemons,
    totalPokemons: filteredPokemons.length,
    page: parseInt(page),
    limit: parseInt(limit)
  });
});

app.post('/pokemons', (req, res) => {
  const { id, name, types, url } = req.body;

  if (!id || !name || !types || !url) {
    return res.status(400).json({ error: "Missing required data." });
  }

  if (types.length < 1 || types.length > 2) {
    return res.status(400).json({ error: "Pokémon can only have one or two types." });
  }

  for (let type of types) {
    if (!pokemonTypes.includes(type.toLowerCase())) {
      return res.status(400).json({ error: "Pokémon's type is invalid." });
    }
  }

  const existingPokemon = pokemons.find(pokemon => pokemon.id === id || pokemon.name === name.toLowerCase());
  if (existingPokemon) {
    return res.status(400).json({ error: "The Pokémon already exists." });
  }

  const newPokemon = {
    id,
    name: name.toLowerCase(),
    types: types.map(type => type.toLowerCase()),
    url
  };

  pokemons.push(newPokemon);

  res.status(201).json({
    message: "New Pokémon created successfully.",
    data: newPokemon
  });
})

app.get('/pokemons/type/:type', (req, res) => {
  const type = req.params.type.toLowerCase();
  const filteredPokemons = pokemons.filter(pokemon =>
    pokemon.types.includes(type)
  );

  res.json({
    data: filteredPokemons,
    totalResults: filteredPokemons.length
  });
});

app.get('/pokemons/name/:name', (req, res) => {
  const name = req.params.name.toLowerCase();
  const filteredPokemons = pokemons.filter(pokemon =>
    pokemon.name.includes(name)
  );

  res.json({
    data: filteredPokemons,
    totalResults: filteredPokemons.length
  });
});

app.get('/pokemons/:id', (req, res) => {
  const { id } = req.params;

  if (id < 1 || id > pokemons.length) {
    return res.status(404).json({ message: "Not found" });
  }

  const result = getNeighbors(id);

  res.json({
    current: result.current,
    previous: result.previous,
    next: result.next
  });
})

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});