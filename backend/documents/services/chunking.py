from langchain_text_splitters.character import RecursiveCharacterTextSplitter

def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> list[str]:
    if not text or not text.strip():
        return []
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    return [c.strip() for c in splitter.split_text(text) if c.strip()]