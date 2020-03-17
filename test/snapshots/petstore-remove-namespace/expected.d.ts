declare namespace Test {
    export interface Error {
        code: number; // int32
        message: string;
    }
    export interface NewPet {
        name: string;
        tag?: string;
    }
    export interface Pet {
        name: string;
        tag?: string;
        id: number; // int64
    }
}
declare namespace Test {
    namespace AddPet {
        export type RequestBody = Test.NewPet;
        namespace Responses {
            export type $200 = Test.Pet;
            export type Default = Test.Error;
        }
    }
    namespace DeletePet {
        namespace Parameters {
            export type Id = number; // int64
        }
        export interface PathParameters {
            id: Parameters.Id /* int64 */;
        }
        namespace Responses {
            export type Default = Test.Error;
        }
    }
    namespace FindPetById {
        namespace Parameters {
            export type Id = number; // int64
        }
        export interface PathParameters {
            id: Parameters.Id /* int64 */;
        }
        namespace Responses {
            export type $200 = Test.Pet;
            export type Default = Test.Error;
        }
    }
    namespace FindPets {
        namespace Parameters {
            export type Limit = number; // int32
            export type Tags = string[];
        }
        export interface QueryParameters {
            tags?: Parameters.Tags;
            limit?: Parameters.Limit /* int32 */;
        }
        namespace Responses {
            export type $200 = Test.Pet[];
            export type Default = Test.Error;
        }
    }
}
