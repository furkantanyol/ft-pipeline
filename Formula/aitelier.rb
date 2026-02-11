class Aitelier < Formula
  desc "Your AI atelier - craft fine-tuned models"
  homepage "https://github.com/furkantanyol/aitelier"
  url "https://registry.npmjs.org/aitelier/-/aitelier-0.3.0.tgz"
  sha256 "c8d3eae160a892e32837db3dcae515e843e5383fef52b8141940c8bcf8b6d59f"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    system bin/"ait", "--version"
    assert_match "0.3.0", shell_output("#{bin}/ait --version")
  end
end
