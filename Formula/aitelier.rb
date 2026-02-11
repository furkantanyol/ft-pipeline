class Aitelier < Formula
  desc "Your AI atelier - craft fine-tuned models"
  homepage "https://github.com/furkantanyol/aitelier"
  url "https://registry.npmjs.org/aitelier/-/aitelier-0.4.0.tgz"
  sha256 "aff1375c065428fa8d5b9785604084b81cd88cdafb87373ec93f75f292c1cc8c"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    system bin/"ait", "--version"
    assert_match "0.4.0", shell_output("#{bin}/ait --version")
  end
end
