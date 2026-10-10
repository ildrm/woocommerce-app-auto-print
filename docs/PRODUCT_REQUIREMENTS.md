# Product requirements and release contract

The full original master prompt in SOURCE_REQUIREMENTS.md is normative. OPTIMIZED_IMPLEMENTATION_PROMPT.md reorganizes it into an executable dependency order while retaining its requirements. REQUIREMENT_MATRIX.md maps current implementation/evidence to those sections and original acceptance scenarios A–P.

The core user outcome is install → connect a store → select a printer → configure paper/template → inspect actual preview → test print → enable eligible-order automation. The engine must remain independent of the GUI, retain jobs across failure, respect authoritative prices/physical dimensions, secure credentials and report ambiguous hardware outcomes honestly.

Target platforms are Windows/macOS/Linux. The requested product includes full template authoring/portability, all listed languages, advanced printer/media/capability support, real-time optional events, multi-device coordination, privacy/retention/backup/update operations and complete acceptance evidence. The current review build only satisfies the implemented scope documented in the matrix; no requirement was deleted to label it complete.

Production acceptance requires every mandatory functional/technical/printing/security/release gate from original §§23,26,27 to pass. Physical hardware and live platform checks cannot be replaced by fixture generation, emulated protocols, CI configuration or screenshots. Open gaps are recorded in KNOWN_LIMITATIONS.md and the next task/checkpoint in IMPLEMENTATION_STATUS.md.
