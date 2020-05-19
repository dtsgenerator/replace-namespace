# @dtsgenerator/replace-namespace

This is the `dtsgenerator` plugin.
Replace matched namespace identifiers by configuration.

# Install

```
npm install @dtsgenerator/replace-namespace
```

# Usage

`dtsgen.json`
```json
{
    "plugins": {
        "@dtsgenerator/replace-namespace": {
            "map": [
                {
                    "from": ["path1", "path2"],
                    "to": ["replaced"]
                }
            ]
        }
    }
}
```

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

| key | type | description |
|-----|------|-------------|
| map | Array of object | the mapping of replacing. |
| map.*n*.from | `Array<string | boolean>` | the definition of from name. if this value is true, it treated as wildcard . |
| map.*n*.to | `Array<string | boolean>` | the definition of to name. |


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
