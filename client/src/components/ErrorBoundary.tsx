import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  private tryAgain = () => {
    this.setState({ hasError: false });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-8">
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            <p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Recuperação do sistema</p>
            <h2 className="mt-3 text-center text-2xl font-semibold text-foreground">Não foi possível carregar esta área.</h2>
            <p className="mt-3 max-w-md text-center text-sm leading-6 text-muted-foreground">Os seus dados não foram alterados. Tente novamente; se o problema continuar, recarregue a página para iniciar uma nova sessão visual.</p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={this.tryAgain}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-2 rounded-lg",
                  "border border-border bg-card text-foreground",
                  "hover:bg-muted cursor-pointer"
                )}
              >
                Tentar novamente
              </button>
              <button
                onClick={() => window.location.reload()}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-2 rounded-lg",
                  "bg-primary text-primary-foreground",
                  "hover:opacity-90 cursor-pointer"
                )}
              >
                <RotateCcw size={16} />
                Recarregar página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
