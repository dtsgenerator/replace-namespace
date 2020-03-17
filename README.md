# @dtsgenerator/replace-namespace

This is the `dtsgenerator` plugin.
Replace matched namespace identifiers.

# Install

```
npm install @dtsgenerator/replace-namespace
```

# Usage

TBD

# Configuration

- the type of configuration
```
type Config = {
    map: {
        from: (string | boolean)[];
        to: string[];
    }[];
};
```

| key | description |
|-----|-------------|
| map | the mapping of replacing. |
| map.*n* | the mapping definition. |
| map.*n*.from | the definition of from name. if this value is true, it treated as wildcard . |
| map.*n*.to | the definition of to name. |


- Example1
```
{
  "map": [
    {
      "from": ["Components", "Schemas"],
      "to": ["Test", "PetStore"]
    },
    {
      "from": ["Paths"],
      "to": ["Test", "PetStore"]
    }
  ]
}
```

- Example2
```
{
  "map": [
    {
      "from": [true, "Schemas"],
      "to": ["Test"]
    }
  ]
}
```
