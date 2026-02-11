class Aitelier < Formula
  desc "Your AI atelier - craft fine-tuned models"
  homepage "https://github.com/furkantanyol/aitelier"
  url "https://registry.npmjs.org/aitelier/-/aitelier-0.5.0.tgz"
  sha256 "37ed9de51381c9b6c9db38db410083c6d0ae98b8121b74ed66f71c8f8379ed59"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    system bin/"ait", "--version"
    assert_match "0.5.0", shell_output("#{bin}/ait --version")
  end
end
