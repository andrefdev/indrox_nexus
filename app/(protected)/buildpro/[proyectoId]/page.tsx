interface Props { params: { proyectoId: string } }
export default async function BuildProProyectoPage({ params }: Props) {
    const { proyectoId } = await params;
    return (
        <div className="space-y-4">
            <h1 className="text-xl font-semibold">Proyecto #{proyectoId}</h1>
            <p className="text-sm text-muted-foreground">Detalle del proyecto y sus hitos (stub).</p>
        </div>
    );
}
