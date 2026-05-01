from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, PageBreak
from reportlab.lib.enums import TA_LEFT, TA_CENTER

W, H = A4

doc = SimpleDocTemplate(
    "Unit2_Topper_Answers.pdf",
    pagesize=A4,
    leftMargin=2*cm, rightMargin=2*cm,
    topMargin=2*cm, bottomMargin=2*cm
)

# ── Styles ──────────────────────────────────────────────────────────────
BASE = "#1A1A2E"
ACCENT = "#4A3F8F"
LIGHT = "#EEEDFE"
TEAL = "#0F6E56"
TEAL_LIGHT = "#E1F5EE"
GRAY = "#F5F5F0"
BORDER = "#C8C4F0"

s = getSampleStyleSheet()

cover_title = ParagraphStyle("CoverTitle", fontName="Helvetica-Bold", fontSize=26,
    textColor=colors.HexColor(ACCENT), alignment=TA_CENTER, leading=32)
cover_sub = ParagraphStyle("CoverSub", fontName="Helvetica", fontSize=13,
    textColor=colors.HexColor("#555"), alignment=TA_CENTER, leading=18)

topic_title = ParagraphStyle("TopicTitle", fontName="Helvetica-Bold", fontSize=15,
    textColor=colors.white, leading=20)
sec_label = ParagraphStyle("SecLabel", fontName="Helvetica-Bold", fontSize=8,
    textColor=colors.HexColor(ACCENT), leading=10, spaceAfter=2)
body = ParagraphStyle("Body", fontName="Helvetica", fontSize=10,
    textColor=colors.HexColor(BASE), leading=15, spaceAfter=2)
mono = ParagraphStyle("Mono", fontName="Courier", fontSize=9,
    textColor=colors.HexColor("#333"), leading=13, leftIndent=10, spaceAfter=1)
insight = ParagraphStyle("Insight", fontName="Helvetica-Oblique", fontSize=10,
    textColor=colors.HexColor(TEAL), leading=14, leftIndent=8, borderPad=4)
bullet = ParagraphStyle("Bullet", fontName="Helvetica", fontSize=10,
    textColor=colors.HexColor(BASE), leading=14, leftIndent=12,
    bulletIndent=4, spaceAfter=1)
kw_label = ParagraphStyle("KwLabel", fontName="Helvetica-Bold", fontSize=9,
    textColor=colors.HexColor(ACCENT), leading=12)
kw_val = ParagraphStyle("KwVal", fontName="Helvetica", fontSize=9,
    textColor=colors.HexColor(BASE), leading=12)

def section(label):
    return [Paragraph(label, sec_label)]

def bullets(items):
    return [Paragraph(f"• {i}", bullet) for i in items]

def mono_lines(lines):
    return [Paragraph(l, mono) for l in lines]

def kw_table(terms):
    rows = []
    for k, v in terms:
        rows.append([Paragraph(k, kw_label), Paragraph(v, kw_val)])
    t = Table(rows, colWidths=[4*cm, 12.5*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor(LIGHT)),
        ('GRID', (0,0), (-1,-1), 0.3, colors.HexColor(BORDER)),
        ('ROWBACKGROUNDS', (0,0), (-1,-1), [colors.white, colors.HexColor("#F8F8FC")]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
    ]))
    return [t]

def topic_header(num, title):
    t = Table([[Paragraph(f"Q{num}. {title}", topic_title)]], colWidths=[16.5*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor(ACCENT)),
        ('ROWBACKGROUNDS', (0,0), (-1,-1), [colors.HexColor(ACCENT)]),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('ROUNDEDCORNERS', [4, 4, 4, 4]),
    ]))
    return [t, Spacer(1, 8)]

def insight_box(text):
    t = Table([[Paragraph(f"★ Smart Insight: {text}", insight)]], colWidths=[16.5*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor(TEAL_LIGHT)),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor(TEAL)),
    ]))
    return [t]

def marks_badge():
    t = Table([["[5 Marks]"]], colWidths=[2*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor(TEAL)),
        ('TEXTCOLOR', (0,0), (-1,-1), colors.white),
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
    ]))
    return t

def divider():
    return [Spacer(1,6), HRFlowable(width="100%", thickness=0.5,
        color=colors.HexColor(BORDER)), Spacer(1,6)]

# ════════════════════════════════════════════════════════════════════
# CONTENT
# ════════════════════════════════════════════════════════════════════
story = []

# ── Cover ───────────────────────────────────────────────────────────
story += [
    Spacer(1, 3*cm),
    Paragraph("Compiler Design", cover_title),
    Spacer(1, 0.4*cm),
    Paragraph("Unit 2 — Syntax Analysis (Parsing)", cover_sub),
    Spacer(1, 0.3*cm),
    Paragraph("Topper-Style 5-Mark Exam Answers", cover_sub),
    Spacer(1, 0.6*cm),
]
t = Table([[marks_badge(), Paragraph("  All 9 topics covered · Structured for maximum marks", kw_val)]], colWidths=[2.5*cm, 14*cm])
t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'MIDDLE'),('LEFTPADDING',(0,0),(-1,-1),0)]))
story += [t, Spacer(1, 4*cm),
    HRFlowable(width="60%", thickness=1, color=colors.HexColor(ACCENT)),
    Spacer(1, 0.3*cm),
    Paragraph("Based on University Curriculum · Exam-Ready Format", cover_sub),
    PageBreak()
]

# ═══════════════════════════════════════════════════════════════════
# Q1: Context-Free Grammar
# ═══════════════════════════════════════════════════════════════════
story += topic_header(1, "Context-Free Grammar (CFG)")
story += section("DEFINITION")
story += [Paragraph("CFG = Formal system to define programming language syntax. More powerful than Regular Expressions — handles nested/recursive structures. Used by parsers to validate token sequences.", body), Spacer(1,6)]

story += section("COMPONENTS — G = (V, T, P, S)")
data = [
    ["Component", "Symbol", "Example"],
    ["Terminals", "T", "id, +, *, (, )"],
    ["Non-Terminals", "V", "Expr, Term, Factor"],
    ["Productions", "P", "Expr → Expr + Term"],
    ["Start Symbol", "S", "Expr"],
]
tbl = Table(data, colWidths=[5*cm, 3*cm, 8.5*cm])
tbl.setStyle(TableStyle([
    ('BACKGROUND',(0,0),(-1,0), colors.HexColor(ACCENT)),
    ('TEXTCOLOR',(0,0),(-1,0), colors.white),
    ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),
    ('FONTSIZE',(0,0),(-1,-1),9),
    ('GRID',(0,0),(-1,-1),0.3,colors.HexColor(BORDER)),
    ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white, colors.HexColor(GRAY)]),
    ('TOPPADDING',(0,0),(-1,-1),4), ('BOTTOMPADDING',(0,0),(-1,-1),4),
    ('LEFTPADDING',(0,0),(-1,-1),6),
]))
story += [tbl, Spacer(1,6)]

story += section("VISUAL FLOW — Derivation of  id + id")
story += mono_lines([
    "Expr  →  Expr + Term  →  Term + Term  →  id + Term  →  id + id",
    "",
    "Parse Tree:",
    "        Expr",
    "       /    \\",
    "    Expr    Term",
    "     |        |",
    "    Term      id",
    "     |",
    "     id",
])
story.append(Spacer(1,6))

story += section("CORE POINTS")
story += bullets([
    "CFG = G(V, T, P, S) — 4-tuple formal definition",
    "Terminals = actual tokens (leaf nodes in parse tree)",
    "Non-terminals = syntactic categories (internal nodes)",
    "Productions = rewriting rules (A → α)",
    "Supports left/right recursion and nested structures",
    "Regular expressions CANNOT describe nested brackets — CFG can",
    "CFG drives parser construction (LL, LR, LALR)",
])
story.append(Spacer(1,6))

story += section("KEY TERMS")
story += kw_table([
    ("CFG", "Context-Free Grammar — formal grammar for PL syntax"),
    ("Terminal", "Actual token; leaf of parse tree"),
    ("Non-Terminal", "Variable / syntactic category"),
    ("Production", "Replacement rule A → α"),
    ("Derivation", "Sequence of rule applications from start symbol"),
    ("Parse Tree", "Hierarchical representation of derivation"),
])
story.append(Spacer(1,8))

story += insight_box("CFG is the mathematical backbone of every parser — without it, syntactic validation of recursive/nested constructs is impossible.")
story += [Spacer(1,14), PageBreak()]

# ═══════════════════════════════════════════════════════════════════
# Q2: Parse Tree and Ambiguity
# ═══════════════════════════════════════════════════════════════════
story += topic_header(2, "Parse Tree and Ambiguity")
story += section("DEFINITION")
story += [Paragraph("Parse Tree = tree representation of string derivation from CFG. Root = Start Symbol, Internal nodes = Non-terminals, Leaves = Terminals. Ambiguity = one string has 2+ distinct parse trees.", body), Spacer(1,6)]

story += section("VISUAL — Two Trees for  2 + 3 * 4  (Ambiguous Grammar)")
story += mono_lines([
    "Tree 1 (Correct — * first):       Tree 2 (Wrong — + first):",
    "       Expr                               Expr",
    "      /    \\                             /    \\",
    "    Expr    Expr                       Expr    Expr",
    "     |     /   \\                      /   \\     |",
    "     2   Expr  Expr                 Expr  Expr   4",
    "          |     |                    |     |",
    "          3     4                    2     3",
    "Result: 2+(3*4)=14                Result: (2+3)*4=20  ← WRONG",
])
story.append(Spacer(1,6))

story += section("REMOVING AMBIGUITY — Enforce Precedence in Grammar")
story += mono_lines([
    "Expr   → Expr + Term | Term",
    "Term   → Term * Factor | Factor",
    "Factor → number",
    "Rule: * binds tighter than + (lower in grammar = higher precedence)",
])
story.append(Spacer(1,6))

story += section("CORE POINTS")
story += bullets([
    "Parse tree nodes: Root=Start, Internal=Non-terminal, Leaf=Terminal",
    "Ambiguous grammar → multiple parse trees → undefined behavior",
    "Ambiguity causes wrong operator precedence / associativity",
    "Solution 1: Restructure grammar (stratify by precedence)",
    "Solution 2: Disambiguating rules (precedence declarations)",
    "Left recursion enforces left-associativity  (A → A op B)",
    "Compilers require UNAMBIGUOUS grammars for deterministic parsing",
])
story.append(Spacer(1,6))

story += section("KEY TERMS")
story += kw_table([
    ("Parse Tree", "Hierarchical derivation structure"),
    ("Ambiguity", "String with 2+ distinct parse trees"),
    ("Precedence", "* > + enforced by grammar stratification"),
    ("Associativity", "Left/right grouping of same-level operators"),
    ("Left Recursion", "A → A α — enforces left-associativity"),
])
story.append(Spacer(1,8))
story += insight_box("An ambiguous grammar is not a parsing error — it is a grammar design error; it must be eliminated before parser construction.")
story += [Spacer(1,14), PageBreak()]

# ═══════════════════════════════════════════════════════════════════
# Q3: Top-Down Parsing
# ═══════════════════════════════════════════════════════════════════
story += topic_header(3, "Top-Down Parsing")
story += section("DEFINITION")
story += [Paragraph("Top-Down Parsing = parsing strategy that starts from the Start Symbol and expands productions downward until terminals match the input. Always performs a Leftmost Derivation.", body), Spacer(1,6)]

story += section("VISUAL PIPELINE")
story += mono_lines([
    "Token Stream  →  [Start Symbol]  →  Expand Leftmost NT  →  Match Terminals",
    "                      |                     |",
    "                   Grammar              Lookahead",
    "",
    "Example:  Grammar: S → aA,  A → b     Input: ab",
    "  Step 1:  S         (start)",
    "  Step 2:  aA        (apply S → aA)",
    "  Step 3:  ab        (apply A → b)  ✓ Match!",
])
story.append(Spacer(1,6))

story += section("TYPES OF TOP-DOWN PARSERS")
data2 = [
    ["Type", "Method", "Key Property"],
    ["Recursive Descent", "Recursive functions per NT", "May backtrack; simple"],
    ["LL(1)", "Table-driven, 1 lookahead", "Predictive; no backtrack"],
]
tbl2 = Table(data2, colWidths=[4.5*cm, 6*cm, 6*cm])
tbl2.setStyle(TableStyle([
    ('BACKGROUND',(0,0),(-1,0), colors.HexColor(ACCENT)),
    ('TEXTCOLOR',(0,0),(-1,0), colors.white),
    ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),
    ('FONTSIZE',(0,0),(-1,-1),9),
    ('GRID',(0,0),(-1,-1),0.3,colors.HexColor(BORDER)),
    ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white, colors.HexColor(GRAY)]),
    ('TOPPADDING',(0,0),(-1,-1),4), ('BOTTOMPADDING',(0,0),(-1,-1),4),
    ('LEFTPADDING',(0,0),(-1,-1),6),
]))
story += [tbl2, Spacer(1,6)]

story += section("CORE POINTS")
story += bullets([
    "Direction: Root → Leaves (Top to Bottom)",
    "Always expands the leftmost non-terminal first",
    "Leftmost derivation: replace leftmost NT at each step",
    "Backtracking required if wrong production chosen",
    "LL(1) avoids backtracking using FIRST/FOLLOW + parsing table",
    "Cannot handle Left Recursion directly (causes infinite loop)",
    "Left recursion must be eliminated before LL(1) construction",
])
story.append(Spacer(1,6))

story += section("KEY TERMS")
story += kw_table([
    ("Top-Down", "Start symbol → terminals; builds tree top to bottom"),
    ("Leftmost Derivation", "Always expand leftmost non-terminal"),
    ("Backtracking", "Undo wrong production choice and retry"),
    ("Lookahead", "Next input token used to predict production"),
    ("Left Recursion", "A → Aα — illegal for LL parsers"),
])
story.append(Spacer(1,8))
story += insight_box("Top-down parsing simulates a proof-by-construction: it tries to derive the input from the axiom (start symbol), rejecting if no valid derivation exists.")
story += [Spacer(1,14), PageBreak()]

# ═══════════════════════════════════════════════════════════════════
# Q4: Recursive Descent Parsing
# ═══════════════════════════════════════════════════════════════════
story += topic_header(4, "Recursive Descent Parsing")
story += section("DEFINITION")
story += [Paragraph("Recursive Descent Parser = top-down parser where each non-terminal has a corresponding recursive function. Functions call each other to match input tokens. Parse tree is implicitly built via call stack.", body), Spacer(1,6)]

story += section("FUNCTION CALL FLOW — Input: id + id")
story += mono_lines([
    "Grammar (after left-recursion removal):",
    "  E  → T E'        E' → + T E' | ε        T → id",
    "",
    "E()  →  T()  →  match(id)          [id consumed]",
    "     →  E'() →  match(+)",
    "             →  T()  →  match(id)  [+id consumed]",
    "             →  E'() →  ε          [done]",
    "",
    "Each function call = one node in the parse tree",
])
story.append(Spacer(1,6))

story += section("PARSE TREE")
story += mono_lines([
    "         E",
    "        / \\",
    "       T   E'",
    "       |  / | \\",
    "      id +  T  E'",
    "            |   |",
    "           id   ε",
])
story.append(Spacer(1,6))

story += section("CORE POINTS")
story += bullets([
    "One function per non-terminal in the grammar",
    "Function calls = implicit parse tree construction",
    "match(token) = consume terminal from input",
    "Cannot handle Left Recursion → causes infinite recursion",
    "Left recursion must be removed: A→Aα becomes A→βA'",
    "Easy to hand-code; used in many real compilers (GCC, Clang)",
    "May require backtracking if grammar is not LL(1)",
])
story.append(Spacer(1,6))

story += section("KEY TERMS")
story += kw_table([
    ("Recursive Descent", "Parser using one function per non-terminal"),
    ("match()", "Function to consume and verify a terminal token"),
    ("Left Recursion", "A → Aα — must be eliminated"),
    ("ε (epsilon)", "Empty production; function returns without consuming"),
    ("Call Stack", "Mirrors the parse tree structure during parsing"),
])
story.append(Spacer(1,8))
story += insight_box("In recursive descent parsing, the program structure IS the grammar — each function mirrors a grammar rule, making the code self-documenting.")
story += [Spacer(1,14), PageBreak()]

# ═══════════════════════════════════════════════════════════════════
# Q5: LL(1) Parsing
# ═══════════════════════════════════════════════════════════════════
story += topic_header(5, "LL(1) Parsing (Predictive Parser)")
story += section("DEFINITION")
story += [Paragraph("LL(1) = table-driven top-down parser. L = Left-to-right scan, L = Leftmost derivation, 1 = one lookahead token. Uses precomputed parsing table M[NT, Terminal] to select productions deterministically.", body), Spacer(1,6)]

story += section("PARSING MODEL")
story += mono_lines([
    "Input Buffer: id + id $",
    "Stack:        [E, $]",
    "Parsing Table: M[E, id] = E → T E'",
    "",
    "Stack       | Input      | Action",
    "------------|------------|------------------",
    "E           | id + id $  | E → T E'",
    "T E'        | id + id $  | T → id",
    "id E'       | id + id $  | match id",
    "E'          | + id $     | E' → + T E'",
    "+ T E'      | + id $     | match +",
    "T E'        | id $       | T → id",
    "id E'       | id $       | match id",
    "E'          | $          | E' → ε  → Accept",
])
story.append(Spacer(1,6))

story += section("CORE POINTS")
story += bullets([
    "LL(1): L=left scan, L=leftmost derivation, 1=one lookahead",
    "Stack-based; no recursion needed (unlike recursive descent)",
    "Parsing table M[A, a] guides every production choice",
    "No backtracking — O(n) time complexity",
    "Grammar must be: no left recursion + left-factored + unambiguous",
    "FIRST sets fill most table entries; FOLLOW fills ε entries",
    "Error = blank cell in parsing table",
])
story.append(Spacer(1,6))

story += section("KEY TERMS")
story += kw_table([
    ("LL(1)", "Left-to-right, Leftmost derivation, 1 lookahead"),
    ("Parsing Table", "M[NT, Terminal] → production to apply"),
    ("Predictive Parser", "Selects rule without backtracking"),
    ("Left Factoring", "Factor common prefix: A→αβ|αγ becomes A→αA', A'→β|γ"),
    ("Lookahead", "Current input token used for table lookup"),
    ("Stack", "Holds grammar symbols; top must match/reduce"),
])
story.append(Spacer(1,8))
story += insight_box("LL(1) parsing converts the grammar into a lookup table, transforming a search problem into a direct-index operation — making it linear-time.")
story += [Spacer(1,14), PageBreak()]

# ═══════════════════════════════════════════════════════════════════
# Q6: FIRST and FOLLOW Sets
# ═══════════════════════════════════════════════════════════════════
story += topic_header(6, "FIRST and FOLLOW Sets")
story += section("DEFINITION")
story += [Paragraph("FIRST(A) = set of terminals that begin strings derivable from A. FOLLOW(A) = set of terminals that can appear immediately after A in some sentential form. Together, they construct the LL(1) parsing table.", body), Spacer(1,6)]

story += section("COMPUTATION RULES")
story += mono_lines([
    "FIRST Rules:",
    "  If A → aα       : a ∈ FIRST(A)",
    "  If A → Bα       : FIRST(B) ⊆ FIRST(A)",
    "  If A → ε        : ε ∈ FIRST(A)",
    "",
    "FOLLOW Rules:",
    "  Start symbol    : $ ∈ FOLLOW(S)",
    "  If A → αBβ      : FIRST(β)−{ε} ⊆ FOLLOW(B)",
    "  If A → αB or ε∈FIRST(β) : FOLLOW(A) ⊆ FOLLOW(B)",
])
story.append(Spacer(1,6))

story += section("WORKED EXAMPLE")
story += mono_lines([
    "Grammar:  E → T E'    E' → + T E' | ε    T → id",
])
data3 = [
    ["Non-Terminal", "FIRST", "FOLLOW"],
    ["E",  "{ id }",   "{ $ }"],
    ["E'", "{ +, ε }", "{ $ }"],
    ["T",  "{ id }",   "{ +, $ }"],
]
tbl3 = Table(data3, colWidths=[4*cm, 6.25*cm, 6.25*cm])
tbl3.setStyle(TableStyle([
    ('BACKGROUND',(0,0),(-1,0), colors.HexColor(ACCENT)),
    ('TEXTCOLOR',(0,0),(-1,0), colors.white),
    ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),
    ('FONTSIZE',(0,0),(-1,-1),9),
    ('GRID',(0,0),(-1,-1),0.3,colors.HexColor(BORDER)),
    ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white, colors.HexColor(GRAY)]),
    ('TOPPADDING',(0,0),(-1,-1),4), ('BOTTOMPADDING',(0,0),(-1,-1),4),
    ('LEFTPADDING',(0,0),(-1,-1),6),
]))
story += [tbl3, Spacer(1,6)]

story += section("CORE POINTS")
story += bullets([
    "FIRST guides production choice when NT is on stack top",
    "FOLLOW used when ε-production is applicable",
    "M[A, a] = A→α if a ∈ FIRST(α)",
    "M[A, a] = A→ε if a ∈ FOLLOW(A) and ε ∈ FIRST(α)",
    "Conflict in table cell = grammar is NOT LL(1)",
    "FIRST of a string = FIRST of its first symbol (if no ε)",
    "$ (end marker) always in FOLLOW of start symbol",
])
story.append(Spacer(1,8))
story += insight_box("FIRST and FOLLOW are the grammar's decision oracle — they encode all context needed for deterministic single-lookahead prediction.")
story += [Spacer(1,14), PageBreak()]

# ═══════════════════════════════════════════════════════════════════
# Q7: Bottom-Up Parsing & Shift-Reduce
# ═══════════════════════════════════════════════════════════════════
story += topic_header(7, "Bottom-Up Parsing & Shift-Reduce")
story += section("DEFINITION")
story += [Paragraph("Bottom-Up Parsing = starts from input tokens and reduces them to the Start Symbol. Implements Rightmost Derivation in Reverse. Shift-Reduce is the core mechanism using a stack and input buffer.", body), Spacer(1,6)]

story += section("VISUAL PIPELINE")
story += mono_lines([
    "Input Tokens  →  SHIFT onto Stack  →  REDUCE (RHS→LHS)  →  Start Symbol",
    "                                                                 (Accept)",
    "",
    "Top-down:  Start → ... → Input   (expand)",
    "Bottom-up: Input → ... → Start   (reduce)  ← OPPOSITE direction",
])
story.append(Spacer(1,6))

story += section("SHIFT-REDUCE TRACE — Input: id + id")
story += mono_lines([
    "Grammar: E → E + T | T    T → id",
    "",
    "Stack    | Input   | Action",
    "---------|---------|------------------",
    "—        | id+id$  | Shift",
    "id       | +id$    | Reduce T → id",
    "T        | +id$    | Reduce E → T",
    "E        | +id$    | Shift",
    "E+       | id$     | Shift",
    "E+id     | $       | Reduce T → id",
    "E+T      | $       | Reduce E → E+T",
    "E        | $       | Accept ✓",
])
story.append(Spacer(1,6))

story += section("CORE POINTS")
story += bullets([
    "Shift = push next input token onto stack",
    "Reduce = pop RHS from stack, push LHS non-terminal",
    "Handle = RHS of a production on top of stack",
    "Rightmost derivation applied in reverse during reduction",
    "Parse tree built from leaves (tokens) up to root (start symbol)",
    "Shift-Reduce conflict = ambiguity in grammar",
    "More powerful than LL(1) — handles larger grammar class",
])
story.append(Spacer(1,6))

story += section("KEY TERMS")
story += kw_table([
    ("Shift", "Push next input token onto parse stack"),
    ("Reduce", "Replace handle (RHS) on stack with LHS non-terminal"),
    ("Handle", "RHS of a production that can be reduced"),
    ("Rightmost Derivation", "Reversed during bottom-up parsing"),
    ("Conflict", "Both shift and reduce applicable — grammar ambiguity"),
])
story.append(Spacer(1,8))
story += insight_box("Shift-reduce parsing reverses rightmost derivation — it reconstructs the compiler's grammar proof from the evidence (tokens) rather than the theorem (start symbol).")
story += [Spacer(1,14), PageBreak()]

# ═══════════════════════════════════════════════════════════════════
# Q8: LR Parsing
# ═══════════════════════════════════════════════════════════════════
story += topic_header(8, "LR Parsing")
story += section("DEFINITION")
story += [Paragraph("LR Parsing = table-driven bottom-up parser. L = Left-to-right scan, R = Rightmost derivation in reverse. Uses ACTION and GOTO tables. More powerful than LL(1) — handles left recursion and larger grammar classes.", body), Spacer(1,6)]

story += section("LR PARSER MODEL")
story += mono_lines([
    "  [Stack: s0 s1 ... sm]   |   Input: a1 a2 ... an $",
    "              ↕                         ↕",
    "        ACTION Table          GOTO Table",
    "   ACTION[sm, ai] = Shift/Reduce/Accept/Error",
    "   GOTO[sm, A]    = next state after reducing to A",
])
story.append(Spacer(1,6))

story += section("TYPES OF LR PARSERS — Increasing Power")
data4 = [
    ["Parser", "Full Form", "Table Size", "Grammar Class"],
    ["SLR",  "Simple LR",      "Small",   "LR(0) items + FOLLOW"],
    ["LALR", "Look-Ahead LR",  "Medium",  "SLR + merged states (used in Yacc)"],
    ["CLR",  "Canonical LR",   "Large",   "Full LR(1) — most powerful"],
]
tbl4 = Table(data4, colWidths=[2.5*cm, 4*cm, 3*cm, 7*cm])
tbl4.setStyle(TableStyle([
    ('BACKGROUND',(0,0),(-1,0), colors.HexColor(ACCENT)),
    ('TEXTCOLOR',(0,0),(-1,0), colors.white),
    ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),
    ('FONTSIZE',(0,0),(-1,-1),9),
    ('GRID',(0,0),(-1,-1),0.3,colors.HexColor(BORDER)),
    ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white, colors.HexColor(GRAY)]),
    ('TOPPADDING',(0,0),(-1,-1),4), ('BOTTOMPADDING',(0,0),(-1,-1),4),
    ('LEFTPADDING',(0,0),(-1,-1),6),
]))
story += [tbl4, Spacer(1,6)]

story += section("CORE POINTS")
story += bullets([
    "LR: L=left-to-right scan, R=rightmost derivation (reversed)",
    "ACTION[state, terminal] = Shift(s) | Reduce(r) | Accept | Error",
    "GOTO[state, non-terminal] = next state after reduction",
    "LR items = productions with a dot marking parser position",
    "LR(0) → SLR(1) → LALR(1) → CLR(1): power increases",
    "LALR(1) = practical choice (used in Yacc/Bison)",
    "Handles left recursion naturally — no grammar transformation needed",
])
story.append(Spacer(1,6))

story += section("KEY TERMS")
story += kw_table([
    ("LR Item", "Production with a dot: E → E • + T"),
    ("ACTION Table", "Shift/Reduce/Accept decision for (state, terminal)"),
    ("GOTO Table", "State transition after reduction to non-terminal"),
    ("LALR", "Look-Ahead LR — merges CLR states; used in Yacc/Bison"),
    ("Canonical LR", "Most powerful LR variant; full LR(1) item sets"),
])
story.append(Spacer(1,8))
story += insight_box("LALR(1) is the engineering sweet spot — it approximates the power of full CLR while keeping table size manageable, which is why Yacc/Bison use it.")
story += [Spacer(1,14), PageBreak()]

# ═══════════════════════════════════════════════════════════════════
# Q9: Error Handling in Parsing
# ═══════════════════════════════════════════════════════════════════
story += topic_header(9, "Error Handling in Parsing")
story += section("DEFINITION")
story += [Paragraph("Error Handling = mechanism by which the parser detects, reports, and recovers from syntax errors without aborting compilation. Goal: detect all errors in a single pass and continue parsing.", body), Spacer(1,6)]

story += section("VISUAL PIPELINE")
story += mono_lines([
    "Token Stream  →  Parser  →  Error Detected?",
    "                                  |",
    "              YES ─────────────────────────────────────",
    "               |                                        |",
    "          Report Error                           Recover & Continue",
    "               |                                        |",
    "         (line, token)          Panic / Phrase-level / Error Prod",
])
story.append(Spacer(1,6))

story += section("ERROR RECOVERY STRATEGIES")
data5 = [
    ["Strategy", "Method", "Use Case"],
    ["Panic Mode",       "Skip tokens until sync token found",   "Simple; fast recovery"],
    ["Phrase-Level",     "Local correction (insert/delete token)", "LL/LR parsers"],
    ["Error Productions","Add error rules to grammar",            "Anticipated errors"],
    ["Global Correction","Minimum edit distance repair",          "Theoretical; expensive"],
]
tbl5 = Table(data5, colWidths=[4*cm, 6.5*cm, 6*cm])
tbl5.setStyle(TableStyle([
    ('BACKGROUND',(0,0),(-1,0), colors.HexColor(ACCENT)),
    ('TEXTCOLOR',(0,0),(-1,0), colors.white),
    ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),
    ('FONTSIZE',(0,0),(-1,-1),9),
    ('GRID',(0,0),(-1,-1),0.3,colors.HexColor(BORDER)),
    ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white, colors.HexColor(GRAY)]),
    ('TOPPADDING',(0,0),(-1,-1),4), ('BOTTOMPADDING',(0,0),(-1,-1),4),
    ('LEFTPADDING',(0,0),(-1,-1),6),
]))
story += [tbl5, Spacer(1,6)]

story += section("CORE POINTS")
story += bullets([
    "Syntax error = token doesn't match expected grammar symbol",
    "Panic mode: skip tokens until synchronizing token (;, }) found",
    "Phrase-level: insert/delete/replace single token to fix error",
    "Error productions: grammar rules like stmt → error ; added",
    "Goal = report multiple errors in one compilation pass",
    "LR parsers detect errors earlier than LL parsers (more states)",
    "Error message must include: line number, expected vs found token",
])
story.append(Spacer(1,6))

story += section("KEY TERMS")
story += kw_table([
    ("Syntax Error",      "Token sequence violates grammar rules"),
    ("Panic Mode",        "Skip input until a safe synchronization point"),
    ("Phrase-Level",      "Local token correction to resume parsing"),
    ("Error Production",  "Grammar rule that explicitly handles common mistakes"),
    ("Sync Token",        "Token used to resynchronize after error (e.g., ; })"),
    ("Error Recovery",    "Mechanism to continue parsing after an error"),
])
story.append(Spacer(1,8))
story += insight_box("A compiler that stops at the first error is useless in practice — robust error recovery is what separates production compilers from academic ones.")

# Build PDF
doc.build(story)
print("PDF created successfully.")