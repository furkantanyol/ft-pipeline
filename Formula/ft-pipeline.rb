class FtPipeline < Formula
  desc "CLI for collecting, rating, formatting, and iterating on LLM fine-tuning datasets"
  homepage "https://github.com/furkantanyol/ft-pipeline"
  url "https://registry.npmjs.org/ft-pipeline/-/ft-pipeline-0.1.0.tgz"
  sha256 "" # Will be updated on release
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    system bin/"ft", "--version"
    assert_match "0.1.0", shell_output("#{bin}/ft --version")
  end
end
