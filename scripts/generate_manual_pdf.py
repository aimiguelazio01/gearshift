import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to dynamically compute and print total page numbers."""
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_header_footer(self, page_count):
        if self._pageNumber == 1:
            return  # Suppress headers/footers on cover page

        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Header
        self.drawString(40, 805, "GEARSHIFT AUTOMOTIVE — Manual do Utilizador & Guia de Operações")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(40, 800, 555, 800)

        # Footer
        self.line(40, 45, 555, 45)
        self.drawString(40, 32, "Confidencial • Uso Interno da Oficina • Versão 2.0")
        page_text = f"Página {self._pageNumber} de {page_count}"
        self.drawRightString(555, 32, page_text)
        self.restoreState()

def create_manual_pdf(filename="Manual_de_Instrucoes_GearShift.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=55,
        bottomMargin=55,
    )

    styles = getSampleStyleSheet()

    # Colors
    primary_color = colors.HexColor("#0F172A")
    brand_blue = colors.HexColor("#1D4ED8")
    accent_cyan = colors.HexColor("#0284C7")
    dark_slate = colors.HexColor("#334155")
    card_bg = colors.HexColor("#F8FAFC")
    step_num_bg = colors.HexColor("#2563EB")

    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=26,
        leading=32,
        textColor=primary_color,
        alignment=1,
    )

    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=13,
        leading=18,
        textColor=accent_cyan,
        alignment=1,
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=brand_blue,
        spaceBefore=14,
        spaceAfter=5,
        keepWithNext=True,
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=primary_color,
        spaceBefore=8,
        spaceAfter=3,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13.5,
        textColor=dark_slate,
        spaceAfter=5,
    )

    bullet_style = ParagraphStyle(
        'BulletText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=13,
        textColor=dark_slate,
        leftIndent=12,
        spaceAfter=3,
    )

    note_style = ParagraphStyle(
        'NoteText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=12,
        textColor=colors.HexColor("#1E293B"),
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
        alignment=0,
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=dark_slate,
    )

    step_title_style = ParagraphStyle(
        'StepTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=brand_blue,
    )

    story = []

    # ══════════════════════════════════════════════════════════
    # CAPA / COVER PAGE
    # ══════════════════════════════════════════════════════════
    story.append(Spacer(1, 35))
    story.append(Paragraph("GEARSHIFT AUTOMOTIVE", title_style))
    story.append(Spacer(1, 8))
    story.append(Paragraph("SISTEMA DE GESTÃO INTEGRADA DE OFICINA AUTOMÓVEL", subtitle_style))
    story.append(Spacer(1, 15))
    story.append(HRFlowable(width="60%", thickness=2, color=brand_blue, spaceBefore=5, spaceAfter=20))

    cover_box_data = [
        [
            Paragraph("<b>MANUAL DO UTILIZADOR & GUIA OPERACIONAL PASSO-A-PASSO</b><br/><br/>"
                      "Este documento contém as especificações completas de funcionamento, "
                      "níveis de acesso por perfil (Administrador, Consultor e Técnico), "
                      "o <b>fluxo prático passo-a-passo para criação de um processo completo</b> "
                      "(Cliente ➔ Viatura ➔ Ordem de Serviço ➔ Atribuição de Elevador & Técnico ➔ Mão de Obra & Peças ➔ Faturação), "
                      "gestão de elevadores, inventário de peças, calendário e portal móvel do cliente com NFC.",
                      body_style)
        ]
    ]
    cover_table = Table(cover_box_data, colWidths=[515])
    cover_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#EFF6FF")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#93C5FD")),
        ('PADDING', (0, 0), (-1, -1), 14),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(cover_table)
    story.append(Spacer(1, 25))

    meta_info = [
        [Paragraph("<b>Versão da Aplicação:</b>", body_style), Paragraph("2.0 (Next.js Edition)", body_style)],
        [Paragraph("<b>Idioma do Sistema:</b>", body_style), Paragraph("Português (PT) & Inglês (EN)", body_style)],
        [Paragraph("<b>Servidor Local:</b>", body_style), Paragraph("http://localhost:3000", body_style)],
        [Paragraph("<b>PIN de Administrador Padrão:</b>", body_style), Paragraph("<b>1234</b> (ou via perfil Carlos Admin)", body_style)],
        [Paragraph("<b>Data de Emissão:</b>", body_style), Paragraph("Setembro de 2026", body_style)],
    ]
    meta_table = Table(meta_info, colWidths=[180, 335])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('PADDING', (0, 0), (-1, -1), 7),
    ]))
    story.append(meta_table)

    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # GUIA PASSO-A-PASSO: PROCESSO COMPLETO END-TO-END
    # ══════════════════════════════════════════════════════════
    story.append(Paragraph("⭐ GUIA PRÁTICO: Processo Completo do Início ao Fim", h1_style))
    story.append(Paragraph(
        "Siga estes <b>7 passos sequenciais</b> para efetuar um processo completo de assistência técnica, "
        "desde o acolhimento do cliente até à liquidação da fatura final:",
        body_style
    ))
    story.append(Spacer(1, 4))

    workflow_steps = [
        [
            Paragraph("<b>PASSO 1</b><br/>Registar o Cliente", step_title_style),
            Paragraph("1. No menu lateral, aceda a <b>Clientes</b> (/customers).<br/>"
                      "2. Clique no botão <b>+ Novo Cliente</b> (janela centrada no ecrã).<br/>"
                      "3. Preencha o <b>Nome</b>, <b>Telemóvel</b>, <b>Email</b>, <b>NIF</b> e <b>Morada</b>.<br/>"
                      "4. Clique em <b>Criar</b> para guardar a ficha do cliente na base de dados.", table_cell_style)
        ],
        [
            Paragraph("<b>PASSO 2</b><br/>Registar a Viatura", step_title_style),
            Paragraph("1. Aceda a <b>Veículos</b> (/vehicles) ou clique diretamente na ficha do cliente.<br/>"
                      "2. Clique em <b>+ Novo Veículo</b>.<br/>"
                      "3. Selecione o Cliente proprietário e introduza: <b>Marca</b>, <b>Modelo</b>, <b>Matrícula</b>, <b>Ano</b>, <b>Combustível</b> e <b>Quilometragem atual (km)</b>.<br/>"
                      "4. O sistema calcula automaticamente a previsão de manutenção recomendada.", table_cell_style)
        ],
        [
            Paragraph("<b>PASSO 3</b><br/>Criar a Ordem de Serviço (O.S.)", step_title_style),
            Paragraph("1. Aceda a <b>Ordens de Serviço</b> (/work-orders) e clique em <b>+ Nova Ordem de Serviço</b>.<br/>"
                      "2. Selecione o <b>Cliente</b> e a respetiva <b>Viatura</b>.<br/>"
                      "3. Descreva as anotações do cliente (ex: <i>'Revisão dos 60.000 km e ruído nos travões da frente'</i>).<br/>"
                      "4. A O.S. é criada de imediato e entra na coluna de <b>Diagnóstico</b> no quadro Kanban.", table_cell_style)
        ],
        [
            Paragraph("<b>PASSO 4</b><br/>Atribuir Elevador, Técnico & Data", step_title_style),
            Paragraph("1. Abra a O.S. criada e clique em <b>Agendar Reparação</b> ou aceda ao <b>Calendário</b> (/calendar).<br/>"
                      "2. Na janela de agendamento: atribua o <b>Elevador</b> (ex: <i>Elevador 1 - 2 Colunas</i>) e o <b>Mecânico Responsável</b> (ex: <i>Pedro Silva</i>).<br/>"
                      "3. Escolha a <b>Data da Reparação</b>, <b>Hora de Início</b> e <b>Duração Prevista (horas)</b>.<br/>"
                      "4. Guarde as alterações para sincronizar a ocupação da oficina.", table_cell_style)
        ],
        [
            Paragraph("<b>PASSO 5</b><br/>Execução Técnica: Horas & Peças", step_title_style),
            Paragraph("1. O mecânico abre a O.S. e move o estado para <b>Em Reparação (In Progress)</b>.<br/>"
                      "2. <b>Mão de Obra:</b> Clica em <i>+ Adicionar Mão de Obra</i>, indica as horas efetuadas e a descrição do serviço (ex: <i>Substituição de pastilhas e óleo</i>).<br/>"
                      "3. <b>Peças Consumidas:</b> Clica em <i>+ Adicionar Peça</i> e seleciona os artigos do inventário (ex: <i>Filtro de Óleo, Óleo 5W30, Pastilhas</i>). O stock do armazém é debitado automaticamente.", table_cell_style)
        ],
        [
            Paragraph("<b>PASSO 6</b><br/>Controlo de Qualidade & Entrega", step_title_style),
            Paragraph("1. Concluído o trabalho mecânico, o estado é avançado para <b>Controlo de Qualidade</b>.<br/>"
                      "2. Realizados os testes de estrada e checklist de segurança, a O.S. passa para <b>Pronto para Entrega</b>.<br/>"
                      "3. O cliente pode acompanhar o progresso em tempo real no seu <b>Portal Móvel PWA</b> ou encostando o seu <b>Cartão NFC</b> ao telemóvel.", table_cell_style)
        ],
        [
            Paragraph("<b>PASSO 7</b><br/>Faturação & Liquidação", step_title_style),
            Paragraph("1. Na O.S. concluída, clique no botão verde <b>💳 Gerar Fatura</b>.<br/>"
                      "2. O sistema gera a fatura oficial discriminando todas as linhas de mão de obra e peças, aplicando a taxa legal de IVA.<br/>"
                      "3. Aceda a <b>Faturas</b> (/invoices), abra o documento e clique em <b>+ Registar Pagamento</b> (Multibanco, Numerário, Transferência ou MB Way).<br/>"
                      "4. A O.S. fica formalmente liquidada e concluída.", table_cell_style)
        ],
    ]

    steps_table = Table(workflow_steps, colWidths=[130, 385])
    steps_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#F1F5F9")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('PADDING', (0, 0), (-1, -1), 5),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (1, 0), (1, -1), [colors.white, card_bg]),
    ]))
    story.append(steps_table)

    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # 1. PERFIS E ACESSOS (RBAC)
    # ══════════════════════════════════════════════════════════
    story.append(Paragraph("1. Estrutura de Perfis e Controlo de Acessos", h1_style))
    story.append(Paragraph(
        "A aplicação possui um sistema robusto de <b>Controlo de Acessos Baseado em Funções (RBAC)</b>. "
        "O menu lateral inferior permite alternar instantaneamente entre utilizadores para testes ou operações reais.",
        body_style
    ))

    rbac_table_data = [
        [
            Paragraph("<b>Perfil / Função</b>", table_header_style),
            Paragraph("<b>Permissões Autorizadas</b>", table_header_style),
            Paragraph("<b>Restrições / Bloqueios</b>", table_header_style)
        ],
        [
            Paragraph("<b>👑 Administrador</b><br/>(ex: Carlos Admin)", table_cell_style),
            Paragraph("• Acesso total a todas as áreas e funcionalidades<br/>"
                      "• Gestão exclusiva da equipa e taxas horárias (/team)<br/>"
                      "• Criação e eliminação de elevadores e técnicos<br/>"
                      "• Gestão de clientes, veículos, peças, faturas e O.S.", table_cell_style),
            Paragraph("• Nenhuma restrição.", table_cell_style)
        ],
        [
            Paragraph("<b>📋 Consultor / Receção</b><br/>(ex: Maria Santos)", table_cell_style),
            Paragraph("• Criação e gestão de Clientes e Veículos<br/>"
                      "• Criação e edição de Ordens de Serviço<br/>"
                      "• Gestão do Catálogo de Peças, Fornecedores e Preços<br/>"
                      "• Emissão de Faturas, Recebimentos e Calendário<br/>"
                      "• Geração do Portal Móvel e Cartão NFC do Cliente", table_cell_style),
            Paragraph("• Sem acesso à área de Técnicos & Salários (/team)<br/>"
                      "• Não pode criar ou eliminar elevadores", table_cell_style)
        ],
        [
            Paragraph("<b>🔧 Mecânico / Técnico</b><br/>(ex: Pedro, Ana, Rui)", table_cell_style),
            Paragraph("• Consulta e avanço de Ordens de Serviço atribuídas<br/>"
                      "• Adição e registo de horas de trabalho (mão de obra)<br/>"
                      "• Registo e consumo de peças nas reparações<br/>"
                      "• Ajuste e contagem de stock técnico em armazém<br/>"
                      "• Consulta do estado dos elevadores e calendário", table_cell_style),
            Paragraph("• <b>Sem acesso a Faturas e Pagamentos</b><br/>"
                      "• <b>Sem acesso aos Preços de Custo e Venda das Peças</b><br/>"
                      "• Não pode criar novos clientes ou veículos<br/>"
                      "• Não pode criar novas ordens de serviço<br/>"
                      "• Não pode gerar a app móvel / cartões NFC", table_cell_style)
        ],
    ]
    rbac_table = Table(rbac_table_data, colWidths=[110, 215, 190])
    rbac_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), primary_color),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('PADDING', (0, 0), (-1, -1), 5),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, card_bg]),
    ]))
    story.append(rbac_table)
    story.append(Spacer(1, 8))

    # ══════════════════════════════════════════════════════════
    # 2. DASHBOARD & 3. CLIENTES / VEÍCULOS
    # ══════════════════════════════════════════════════════════
    story.append(Paragraph("2. Painel Principal (Dashboard)", h1_style))
    story.append(Paragraph(
        "O <b>Dashboard</b> apresenta uma visão em tempo real da oficina: "
        "viaturas em reparação ativa, taxa de ocupação dos elevadores, alertas de stock mínimo de peças, "
        "faturação mensal e faturas pendentes de liquidação. Inclui atalhos rápidos clicáveis para todas as secções.",
        body_style
    ))

    story.append(Paragraph("3. Gestão de Clientes e Frotas de Veículos", h1_style))
    story.append(Paragraph(
        "• <b>Ficha do Cliente (/customers):</b> Registo completo com Nome, Telefone, Email, NIF, Morada e Notas internas.<br/>"
        "• <b>Veículos (/vehicles):</b> Associação de veículos por Marca, Modelo, Matrícula, Ano, Combustível, Quilometragem e histórico de intervenções.<br/>"
        "• <b>Alerta de Revisão:</b> Indicadores visuais automáticos avisam quando um veículo atinge a quilometragem recomendada para manutenção.",
        body_style
    ))
    story.append(Spacer(1, 8))

    # ══════════════════════════════════════════════════════════
    # 4. ORDENS DE SERVIÇO (PIPELINE)
    # ══════════════════════════════════════════════════════════
    story.append(Paragraph("4. Gestão de Ordens de Serviço (O.S.)", h1_style))
    story.append(Paragraph(
        "As Ordens de Serviço controlam todo o ciclo de vida da reparação através de um quadro <b>Kanban interativo</b> ou <b>Tabela detalhada</b>:",
        body_style
    ))

    wo_pipeline = [
        [Paragraph("<b>Etapa da O.S.</b>", table_header_style), Paragraph("<b>Descrição Operacional</b>", table_header_style)],
        [Paragraph("<b>Diagnóstico (Diagnosis)</b>", table_cell_style), Paragraph("Inspeção inicial do veículo pelo consultor/técnico e anotação dos sintomas relatados pelo cliente.", table_cell_style)],
        [Paragraph("<b>Orçamento (Quote)</b>", table_cell_style), Paragraph("Cálculo estimativo de mão de obra e peças necessárias para aprovação pelo cliente.", table_cell_style)],
        [Paragraph("<b>Aprovado (Approved)</b>", table_cell_style), Paragraph("Serviço autorizado pelo cliente, pronto para agendamento de data e atribuição de elevador.", table_cell_style)],
        [Paragraph("<b>Em Reparação (In Progress)</b>", table_cell_style), Paragraph("Trabalho mecânico ativo no elevador com registo de horas do mecânico e peças consumidas do armazém.", table_cell_style)],
        [Paragraph("<b>Controlo de Qualidade (Quality Control)</b>", table_cell_style), Paragraph("Testes finais de estrada, verificação de binários de aperto e limpeza pré-entrega.", table_cell_style)],
        [Paragraph("<b>Pronto para Entrega (Ready)</b>", table_cell_style), Paragraph("Veículo concluído, notificação enviada ao cliente para levantamento na oficina.", table_cell_style)],
        [Paragraph("<b>Faturado / Concluído (Invoiced)</b>", table_cell_style), Paragraph("Fatura gerada no sistema e encerramento administrativo do processo.", table_cell_style)],
    ]
    wo_table = Table(wo_pipeline, colWidths=[150, 365])
    wo_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), brand_blue),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('PADDING', (0, 0), (-1, -1), 4.5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, card_bg]),
    ]))
    story.append(wo_table)

    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # 5. ELEVADORES & 6. CALENDÁRIO
    # ══════════════════════════════════════════════════════════
    story.append(Paragraph("5. Gestão de Elevadores da Oficina (/lifts)", h1_style))
    story.append(Paragraph(
        "A secção de elevadores permite a organização física do espaço de trabalho da oficina:<br/>"
        "• <b>Criação de Novos Elevadores:</b> Botão <i>+ Novo Elevador</i> para adicionar postos de trabalho (ex: 2 Colunas, Tesoura, 4 Colunas com Alinhamento) com capacidade máxima em toneladas.<br/>"
        "• <b>Eliminação Segura:</b> Os administradores podem eliminar elevadores através do botão de eliminação com modal de confirmação. As reparações ativas associadas são automaticamente desvinculadas para evitar inconsistências de dados.<br/>"
        "• <b>Estados em Tempo Real:</b> <i>Livre (Disponível)</i>, <i>Ocupado</i> e <i>Em Manutenção / Avaria</i> com histórico de revisões de segurança.",
        body_style
    ))

    story.append(Paragraph("6. Calendário e Agendamento de Reparações (/calendar)", h1_style))
    story.append(Paragraph(
        "O calendário sincroniza as marcações por dia, semana e mês:<br/>"
        "• <b>Separação entre Data de Entrada e Data de Reparação:</b> A data de criação da O.S. é registada automaticamente, enquanto a data de execução mecânica pode ser agendada livremente.<br/>"
        "• <b>Janela de Agendamento ('Gerir Datas & Agendamento'):</b> Permite atribuir técnico responsável, elevador, hora de início e duração prevista com alinhamento vertical centrado e scroll interno.<br/>"
        "• <b>Reparações não agendadas:</b> Cartão de alerta rápido na parte inferior do calendário para arrastar ou programar serviços pendentes.",
        body_style
    ))
    story.append(Spacer(1, 8))

    # ══════════════════════════════════════════════════════════
    # 7. PEÇAS, FORNECEDORES & CATEGORIAS
    # ══════════════════════════════════════════════════════════
    story.append(Paragraph("7. Gestão de Peças, Inventário, Fornecedores e Categorias (/parts)", h1_style))
    story.append(Paragraph(
        "Sistema completo de gestão de armazém dividido em 3 separadores funcionais:",
        body_style
    ))

    parts_features = [
        [Paragraph("<b>Módulo</b>", table_header_style), Paragraph("<b>Funcionalidades e Ações Disponíveis</b>", table_header_style)],
        [
            Paragraph("<b>📦 Catálogo de Peças</b>", table_cell_style),
            Paragraph("• Registo de Referência (SKU), Nome, Localização na prateleira, Stock e Stock Mínimo.<br/>"
                      "• Visualização de Preço Custo, Preço Venda e Margem (exclusivo para Admin e Consultor).<br/>"
                      "• Botão de ajuste rápido de stock (+/-) com registo obrigatório do motivo.", table_cell_style)
        ],
        [
            Paragraph("<b>🏭 Fornecedores</b>", table_cell_style),
            Paragraph("• <b>Criar Fornecedor:</b> Registo de parceiros comerciais, emails/telefones e prazos médios de entrega.<br/>"
                      "• <b>Eliminar Fornecedor:</b> Botão direto com confirmação. As peças associadas são desvinculadas sem perda de histórico.<br/>"
                      "• Contagem em tempo real de referências fornecidas por cada entidade.", table_cell_style)
        ],
        [
            Paragraph("<b>🏷️ Categorias de Peças</b>", table_cell_style),
            Paragraph("• <b>Criar Categoria:</b> Permite adicionar novas famílias de peças (ex: <i>Iluminação</i>, <i>Transmissão</i>).<br/>"
                      "• <b>Eliminar Categoria:</b> Eliminação com modal de segurança. As peças são reatribuídas à categoria <i>'Outros'</i>.<br/>"
                      "• Autocompletação rápida no formulário de criação de novas peças.", table_cell_style)
        ],
    ]
    parts_table = Table(parts_features, colWidths=[140, 375])
    parts_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), primary_color),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('PADDING', (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, card_bg]),
    ]))
    story.append(parts_table)

    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # 8. EQUIPA, 9. FATURAÇÃO & 10. APP CLIENTE / NFC
    # ══════════════════════════════════════════════════════════
    story.append(Paragraph("8. Técnicos & Equipa da Oficina (/team)", h1_style))
    story.append(Paragraph(
        "<b>Área Exclusiva de Administrador:</b> O menu e a rota `/team` estão ocultados e protegidos por PIN (`1234`). "
        "Permite registar novos mecânicos, definir especialidades (Motor, Eletricidade, Diagnóstico, Mecânica Geral), "
        "configurar o custo/taxa horária (€/h) e consultar o volume de serviços atribuídos a cada colaborador.",
        body_style
    ))

    story.append(Paragraph("9. Faturação e Pagamentos (/invoices)", h1_style))
    story.append(Paragraph(
        "<b>Área Restrita a Administração e Consultores:</b> "
        "Permite converter ordens de serviço concluídas em faturas oficiais com discriminação de mão de obra e peças, "
        "taxa de IVA aplicável, registo de pagamentos parciais ou totais (Multibanco, Numerário, Transferência, MB Way) "
        "e controlo de prazos de vencimento.",
        body_style
    ))

    story.append(Paragraph("10. Aplicação Móvel do Cliente & Cartão NFC (/portal)", h1_style))
    story.append(Paragraph(
        "Cada cliente dispõe de um <b>Portal Web Móvel PWA</b> personalizado acessível via link direto, código QR ou cartão NFC:<br/>"
        "• <b>Início com Reparações Recolhidas:</b> Ao abrir a aplicação móvel, as intervenções iniciam colapsadas para uma leitura limpa, podendo o cliente tocar em qualquer cartão para ver a timeline e os serviços efetuados.<br/>"
        "• <b>Gravação de Cartões NFC NTAG215:</b> O sistema integra suporte direto para gravação de cartões físicos através do leitor PN532 / Arduino ou Web NFC.<br/>"
        "• <b>Transparência Total:</b> O cliente acompanha em tempo real se o seu veículo está em Diagnóstico, Reparação, Controlo de Qualidade ou Pronto para Levantamento.",
        body_style
    ))

    # ══════════════════════════════════════════════════════════
    # 11. BACKUP XLS & 12. TABELA DE UTILIZADORES
    # ══════════════════════════════════════════════════════════
    story.append(Paragraph("11. Cópia de Segurança & Recuperação de Dados (XLS)", h1_style))
    story.append(Paragraph(
        "Na barra lateral (canto inferior), estão disponíveis as ferramentas de segurança de dados:<br/>"
        "• <b>Exportar Backup XLS:</b> Descarrega uma folha Excel completa com todas as tabelas (Clientes, Veículos, O.S., Peças, Elevadores, Faturas e Equipa).<br/>"
        "• <b>Recuperar Backup XLS:</b> Restaura todo o estado do sistema a partir de um ficheiro Excel guardado anteriormente.",
        body_style
    ))

    story.append(Paragraph("12. Referência Rápida de Utilizadores Padrão", h1_style))
    users_quick = [
        [Paragraph("<b>Nome</b>", table_header_style), Paragraph("<b>Função</b>", table_header_style), Paragraph("<b>Perfil de Acesso</b>", table_header_style), Paragraph("<b>Autenticação</b>", table_header_style)],
        [Paragraph("Carlos Admin", table_cell_style), Paragraph("Diretor de Oficina", table_cell_style), Paragraph("👑 Administrador", table_cell_style), Paragraph("PIN: <b>1234</b> / Switch", table_cell_style)],
        [Paragraph("Maria Santos", table_cell_style), Paragraph("Consultora de Serviço", table_cell_style), Paragraph("📋 Service Advisor", table_cell_style), Paragraph("Seleção direta no perfil", table_cell_style)],
        [Paragraph("Pedro Silva", table_cell_style), Paragraph("Mecânico Chefe", table_cell_style), Paragraph("🔧 Técnico (75€/h)", table_cell_style), Paragraph("Seleção direta no perfil", table_cell_style)],
        [Paragraph("Ana Costa", table_cell_style), Paragraph("Técnica Eletricista", table_cell_style), Paragraph("🔧 Técnica (80€/h)", table_cell_style), Paragraph("Seleção direta no perfil", table_cell_style)],
        [Paragraph("Rui Oliveira", table_cell_style), Paragraph("Técnico de Manutenção", table_cell_style), Paragraph("🔧 Técnico (70€/h)", table_cell_style), Paragraph("Seleção direta no perfil", table_cell_style)],
    ]
    users_table = Table(users_quick, colWidths=[100, 130, 140, 145])
    users_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), brand_blue),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('PADDING', (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, card_bg]),
    ]))
    story.append(users_table)

    story.append(Spacer(1, 15))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CBD5E1"), spaceBefore=10, spaceAfter=10))
    story.append(Paragraph("<b>GEARSHIFT AUTOMOTIVE — Manual Oficial de Utilização • Documento Gerado com Sucesso</b>", note_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF Generated successfully at: {os.path.abspath(filename)}")

if __name__ == "__main__":
    out_pdf = sys.argv[1] if len(sys.argv) > 1 else "Manual_de_Instrucoes_GearShift.pdf"
    create_manual_pdf(out_pdf)
