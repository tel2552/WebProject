from bson import ObjectId
from pydantic import ValidationInfo
from typing import Any, Callable, Dict
from pydantic_core import core_schema

# --- Updated PyObjectId for Pydantic v2 ---
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        # Pydantic v1 style, but __get_pydantic_core_schema__ is preferred in v2
        # We'll keep validate for clarity, but core_schema handles the main logic
        yield cls.validate

    @classmethod
    def validate(cls, v: Any, _: ValidationInfo) -> ObjectId: # Add ValidationInfo argument
        """Validate that the input is a valid ObjectId string or already an ObjectId."""
        if isinstance(v, ObjectId):
            return v
        if ObjectId.is_valid(str(v)):
            return ObjectId(str(v))
        raise ValueError("Invalid ObjectId")

    @classmethod
    def __get_pydantic_core_schema__(
        cls, source_type: Any, handler: Callable[[Any], core_schema.CoreSchema]
    ) -> core_schema.CoreSchema:
        """
        Return the Pydantic core schema for ObjectId.
        Handles validation from string and serialization to string.
        """
        from_string_schema = core_schema.chain_schema(
            [
                core_schema.str_schema(),
                core_schema.no_info_plain_validator_function(cls.validate),
            ]
        )
        return core_schema.json_or_python_schema(
            json_schema=from_string_schema,
            python_schema=core_schema.union_schema(
                [
                    core_schema.is_instance_schema(ObjectId),
                    from_string_schema,
                ]
            ),
            serialization=core_schema.plain_serializer_function_ser_schema(str),
        )

    @classmethod
    def __get_pydantic_json_schema__(
        cls, core_schema_obj: core_schema.CoreSchema, handler: Callable[[Any], Dict[str, Any]]
    ) -> Dict[str, Any]:
        json_schema = handler(core_schema_obj)
        json_schema.update(type='string', example='507f1f77bcf86cd799439011')
        return json_schema